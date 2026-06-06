import { useState } from "react";
import { mockLogin } from "../auth/login";
import type { User } from "../types";

/** Landing screen with a mock "Sign in with Google" button. */
export function LoginButton({ onLogin }: { onLogin: (auth: { token: string; user: User }) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      onLogin(await mockLogin());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <h1>AI Trip Planner</h1>
      <p>Plan a personalised, budget-aware trip inside the borders you choose.</p>
      <button className="google-btn" onClick={handleClick} disabled={loading}>
        {loading ? "Signing in..." : "Sign in with Google"}
      </button>
      <p className="hint">Demo mode: sign-in is mocked and loads a seeded demo profile.</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
