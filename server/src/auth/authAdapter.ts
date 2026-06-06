/**
 * Authentication adapter interface. The rest of the app only depends on this
 * shape, so swapping the mock for real Firebase is a one-line change in
 * getAuthAdapter() below.
 */
export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthAdapter {
  /** Verify a bearer token and return the identified user, or throw. */
  verifyToken(token: string): Promise<AuthUser>;
}

import { config } from "../config";
import { mockAuth } from "./mockAuth";
import { createFirebaseAuth } from "./firebaseAuth";

let cached: AuthAdapter | null = null;

export function getAuthAdapter(): AuthAdapter {
  if (cached) return cached;
  cached = config.useMocks ? mockAuth : createFirebaseAuth();
  return cached;
}