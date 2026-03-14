import jwt from "jsonwebtoken";
import { type User } from "@workspace/db";

const JWT_SECRET = process.env.JWT_SECRET || "coreinventory-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export function signToken(user: Pick<User, "id" | "email" | "role">): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): { id: number; email: string; role: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    return payload;
  } catch {
    return null;
  }
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateRefNo(prefix: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${rand}`;
}
