import type { NextFunction, Request, Response } from "express";
import { getAuthAdapter } from "./authAdapter";

/** Express request augmented with the authenticated user id. */
export interface AuthedRequest extends Request {
  userId?: string;
  email?: string;
}

/**
 * Express middleware that requires a valid bearer token. On success it sets
 * req.userId / req.email; otherwise it responds 401. Token verification is
 * delegated to the active auth adapter (mock or Firebase).
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Missing Authorization bearer token" });
    return;
  }
  try {
    const user = await getAuthAdapter().verifyToken(token);
    req.userId = user.userId;
    req.email = user.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}