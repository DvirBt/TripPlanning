export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthAdapter {
  /** Verify a bearer token and return the identified user, or throw. */
  verifyToken(token: string): Promise<AuthUser>;
}

import { createGoogleAuth } from "./googleAuth";

let cached: AuthAdapter | null = null;

export function getAuthAdapter(): AuthAdapter {
  if (cached) return cached;
  cached = createGoogleAuth();
  return cached;
}
