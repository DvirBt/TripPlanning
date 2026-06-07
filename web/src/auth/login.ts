import type { User } from "../types";

const TOKEN_KEY = "trip.token";
const USER_KEY = "trip.user";

export function storeAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredAuth(): { token: string; user: User } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;

  // Reject expired tokens so the user is prompted to sign in again.
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      logout();
      return null;
    }
  } catch {
    logout();
    return null;
  }

  return { token, user: JSON.parse(userRaw) as User };
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
