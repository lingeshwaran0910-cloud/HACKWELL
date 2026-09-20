import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username too long")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password too long"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  confirmPassword: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100).trim(),
  role: z.string().max(100).optional().default("Operator"),
  department: z.string().max(100).optional().default("Emergency Operations"),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  { message: "Passwords do not match", path: ["confirmPassword"] }
);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
