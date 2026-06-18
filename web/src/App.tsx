import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { getStoredAuth, logout } from "./auth/login";
import { Planner } from "./components/Planner";
import { ItineraryView } from "./components/ItineraryView";
import { LoginButton } from "./components/LoginButton";
import { ModelSelector } from "./components/ModelSelector";
import type { Itinerary, LlmProvider, User } from "./types";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export function App() {
  const [auth, setAuth] = useState<{ token: string; user: User } | null>(
    () => getStoredAuth(),
  );
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [provider, setProvider] = useState<LlmProvider>("gemini");

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      {!auth ? (
        <LoginButton onLogin={setAuth} />
      ) : (
        <div className="app">
          <header className="topbar">
            <div className="brand">AI Trip Planner</div>
            <div className="account">
              <ModelSelector value={provider} onChange={setProvider} />
              <span>{auth.user.email}</span>
              <button
                onClick={() => {
                  logout();
                  setAuth(null);
                }}
              >
                Sign out
              </button>
            </div>
          </header>
          <main className="layout">
            <Planner token={auth.token} provider={provider} onItinerary={setItinerary} />
            <ItineraryView itinerary={itinerary} />
          </main>
        </div>
      )}
    </GoogleOAuthProvider>
  );
}
