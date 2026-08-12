import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.js";

export const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "test" ? "test_secret" : null);
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing");
}

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.jwt || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Admin.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Invalid token or user does not exist" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
