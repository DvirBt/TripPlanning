import { config } from "../config";
import type { AuthAdapter } from "./authAdapter";

interface CacheEntry {
  userId: string;
  email: string;
  exp: number;
}

// Avoid a Google API call on every request by caching verified tokens.
const cache = new Map<string, CacheEntry>();

export function createGoogleAuth(): AuthAdapter {
  return {
    async verifyToken(token: string) {
      const now = Date.now();
      const hit = cache.get(token);
      if (hit && hit.exp > now) {
        return { userId: hit.userId, email: hit.email };
      }

      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
      );
      if (!res.ok) throw new Error("Invalid or expired token");

      const data = (await res.json()) as {
        azp?: string;
        aud?: string;
        sub?: string;
        email?: string;
        expires_in?: string;
      };

      // Confirm the token was issued for this application.
      if (
        config.googleClientId &&
        data.azp !== config.googleClientId &&
        data.aud !== config.googleClientId
      ) {
        throw new Error("Token was not issued for this application");
      }
      if (!data.sub) throw new Error("Invalid token: missing subject");

      const entry: CacheEntry = {
        userId: data.sub,
        email: data.email ?? "",
        exp: now + Math.min(Number(data.expires_in ?? 0) * 1000, 5 * 60 * 1000),
      };
      cache.set(token, entry);
      return { userId: entry.userId, email: entry.email };
    },
  };
}