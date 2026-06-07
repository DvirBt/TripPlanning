import { GoogleLogin } from "@react-oauth/google";
import { storeAuth } from "../auth/login";
import type { User } from "../types";

interface Props {
  onLogin: (auth: { token: string; user: User }) => void;
}

function parseJwt(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64)) as Record<string, unknown>;
}

export function LoginButton({ onLogin }: Props) {
  return (
    <div className="login">
      <h1>AI Trip Planner</h1>
      <p>Plan a personalised, budget-aware trip inside the borders you choose.</p>
      <GoogleLogin
        onSuccess={(response) => {
          const token = response.credential!;
          const payload = parseJwt(token);
          const user: User = {
            userId: payload.sub as string,
            email: payload.email as string,
          };
          storeAuth(token, user);
          onLogin({ token, user });
        }}
        onError={() => console.error("Google login failed")}
        useOneTap
      />
    </div>
  );
}
