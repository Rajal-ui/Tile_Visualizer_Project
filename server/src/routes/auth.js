import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/index.js";
import {
  validate,
  AdminSchema,
  AdminLoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "@tile-visualizer/shared/schemas/index.js";
import { sendPasswordResetEmail } from "../services/email.js";
import {
  generateResetToken,
  findAdminByResetToken,
  setAdminPassword,
} from "../services/password-reset.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { JWT_SECRET } from "../config/env.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

router.post("/register", requireAuth, requireRole("superadmin"), async (req, res) => {
  const check = validate(AdminSchema, req.body);
  if (!check.ok) {
    return res.status(400).json({ error: check.errors.join("; ") });
  }

  const { username, name, email, password, role } = check.data;

  try {
    const existing = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      username,
      name,
      email,
      password: hashedPassword,
      role,
    });

    // No cookie assignment on register to preserve existing superadmin session
    
    res.status(201).json({ ok: true, user: admin.toJSON() });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ error: "Failed to register user" });
  }
});

router.post("/login", authRateLimiter, async (req, res) => {
  const check = validate(AdminLoginSchema, req.body);
  if (!check.ok) {
    return res.status(400).json({ error: check.errors.join("; ") });
  }

  const { username, password } = check.data;

  try {
    const admin = await Admin.findOne({ username }).select("+password");
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.cookie("jwt", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
    
    res.json({ ok: true, user: admin.toJSON() });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Failed to log in" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("jwt");
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// Email-bombing protection: same IP is capped regardless of the email used.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests, please try again later.",
});

const NOT_REVEALING_MESSAGE =
  "If that email is registered, a password reset link has been sent.";

/**
 * POST /api/auth/forgot-password
 *
 * Never reveals whether the email exists: unknown emails get the same 200
 * response, and the timing difference is negligible for an internal tool.
 */
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const check = validate(ForgotPasswordSchema, req.body);
  if (!check.ok) {
    return res.status(400).json({ error: check.errors.join("; ") });
  }
  const email = check.data.email.trim().toLowerCase();

  try {
    const admin = await Admin.findOne({ email });
    if (admin) {
      const { token, tokenHash, expiresAt } = generateResetToken();
      admin.resetTokenHash = tokenHash;
      admin.resetTokenExpiresAt = expiresAt;
      await admin.save();
      await sendPasswordResetEmail({ to: email, token });
    }
  } catch (err) {
    console.error("forgot-password error:", err.message);
  }

  res.status(200).json({ ok: true, message: NOT_REVEALING_MESSAGE });
});

/**
 * POST /api/auth/reset-password
 *
 * Consumes the single-use token: on success the stored hash + expiry are
 * cleared, so a replayed token is rejected on the next attempt.
 */
router.post("/reset-password", async (req, res) => {
  const check = validate(ResetPasswordSchema, req.body);
  if (!check.ok) {
    return res.status(400).json({ error: check.errors.join("; ") });
  }

  try {
    const admin = await findAdminByResetToken(
      { token: check.data.token },
      (tokenHash) => Admin.findOne({ resetTokenHash: tokenHash })
    );
    await setAdminPassword(admin, check.data.password);
    res.status(200).json({ ok: true, message: "Password updated. You can now sign in." });
  } catch (err) {
    if (err.name === "InvalidResetTokenError") {
      return res.status(400).json({ error: err.message });
    }
    console.error("reset-password error:", err.message);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
