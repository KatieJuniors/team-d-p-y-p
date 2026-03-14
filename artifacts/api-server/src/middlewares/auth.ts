import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid token" });
    return;
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
    return;
  }
  req.user = payload;
  next();
}

export function requireManager(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "manager") {
    res.status(403).json({ error: "Forbidden", message: "Manager access required" });
    return;
  }
  next();
}
