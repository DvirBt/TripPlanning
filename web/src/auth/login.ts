import type { User } from "../types";

/**
 * Mock "Sign in with Google". Calls the backend, which mints a local bearer
 * token (USE_MOCKS=true). The token and user are kept in memory + localStorage.
 *
 * Real Firebase path (USE_MOCKS=false): replace this with the Firebase Web SDK
 *   import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
 *   const cred = await signInWithPopup(getAuth(), new GoogleAuthProvider());
 *   const token = await cred.user.getIdToken();
 * and send that token as the Authorization bearer on every request.
 */
const TOKEN_KEY = "trip.token";
const USER_KEY = "trip.user";

export async function mockLogin(): Promise<{ token: string; user: User }> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = (await res.json()) as { token: string; user: User };
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export function getStoredAuth(): { token: string; user: User } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  return { token, user: JSON.parse(userRaw) as User };
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
