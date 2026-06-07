import type { User } from "../types";

const TOKEN_KEY = "trip.token";
const USER_KEY = "trip.user";
const EXPIRY_KEY = "trip.token.expiry";

export function storeAuth(token: string, user: User, expiresIn = 3600): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}

export function getStoredAuth(): { token: string; user: User } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!token || !userRaw) return null;
  if (expiry && Number(expiry) < Date.now()) {
    logout();
    return null;
  }
  return { token, user: JSON.parse(userRaw) as User };
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}