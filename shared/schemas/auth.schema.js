import { z } from "zod";

/** Admin roles per the MongoDB `admins` collection spec. */
export const ADMIN_ROLES = ["admin", "superadmin"];

/** Admin document shape (shared contract for seeding + API DTOs). */
export const AdminSchema = z.object({
  username: z.string().trim().toLowerCase().min(3, "Username must be at least 3 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ADMIN_ROLES).default("admin"),
});

/** Login request body. */
export const AdminLoginSchema = z.object({
  username: z.string().trim().toLowerCase().min(3, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/** Forgot-password request body. */
export const ForgotPasswordSchema = z.object({
  email: z.string().email("A valid email is required"),
});

/** Reset-password request body. */
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
