import type { AuthAdapter, AuthUser } from "./authAdapter";

/**
 * Mock authentication used when USE_MOCKS=true. It stands in for "Google
 * Sign-In via Firebase" without any network calls.
 *
 * A mock token is simply base64-encoded JSON: { userId, email }. The frontend
 * mints one at "login" via POST /api/auth/session, and this adapter decodes it.
 * The shape (verify a string, return a user) is identical to the real Firebase
 * adapter, so the rest of the app never knows the difference.
 */
export function encodeMockToken(user: AuthUser): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64");
}

export const mockAuth: AuthAdapter = {
  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const json = Buffer.from(token, "base64").toString("utf8");
      const parsed = JSON.parse(json) as Partial<AuthUser>;
      if (!parsed.userId || !parsed.email) {
        throw new Error("missing fields");
      }
      return { userId: parsed.userId, email: parsed.email };
    } catch {
      throw new Error("Invalid mock token");
    }
  },
};