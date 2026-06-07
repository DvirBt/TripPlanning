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

      // Access token response uses "user_id" and "issued_to";
      // ID token response uses "sub" and "azp" — handle both.
      const data = (await res.json()) as {
        user_id?: string;   // access token
        sub?: string;       // id token
        issued_to?: string; // access token
        azp?: string;       // id token
        audience?: string;  // access token
        aud?: string;       // id token
        email?: string;
        expires_in?: string;
      };

      const userId = data.user_id ?? data.sub;
      if (!userId) throw new Error("Invalid token: missing subject");

      const issuedTo = data.issued_to ?? data.azp ?? data.audience ?? data.aud;
      if (config.googleClientId && issuedTo !== config.googleClientId) {
        throw new Error("Token was not issued for this application");
      }

      const entry: CacheEntry = {
        userId,
        email: data.email ?? "",
        exp: now + Math.min(Number(data.expires_in ?? 0) * 1000, 5 * 60 * 1000),
      };
      cache.set(token, entry);
      return { userId: entry.userId, email: entry.email };
    },
  };
}