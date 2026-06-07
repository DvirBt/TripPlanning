import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { storeAuth } from "../auth/login";
import type { User } from "../types";

interface Props {
  onLogin: (auth: { token: string; user: User }) => void;
}

export function LoginButton({ onLogin }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const googleLogin = useGoogleLogin({
    scope: "email profile",
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch user info");
        const info = (await res.json()) as { sub: string; email: string };
        const user: User = { userId: info.sub, email: info.email };
        storeAuth(tokenResponse.access_token, user, tokenResponse.expires_in);
        onLogin({ token: tokenResponse.access_token, user });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Login failed");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Login failed");
      setLoading(false);
    },
  });

  return (
    <div className="login">
      <h1>AI Trip Planner</h1>
      <p>Plan a personalised, budget-aware trip inside the borders you choose.</p>
      <button
        className="google-btn"
        onClick={() => {
          setLoading(true);
          googleLogin();
        }}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in with Google"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}