import { OAuth2Client } from "google-auth-library";
import { config } from "../config";
import type { AuthAdapter } from "./authAdapter";

const client = new OAuth2Client();

export function createGoogleAuth(): AuthAdapter {
  return {
    async verifyToken(token: string) {
      if (!config.googleClientId) {
        throw new Error("GOOGLE_CLIENT_ID is not set in .env");
      }
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new Error("Invalid token payload");
      return { userId: payload.sub, email: payload.email ?? "" };
    },
  };
}
