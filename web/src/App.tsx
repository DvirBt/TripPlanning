import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { getStoredAuth, logout } from "./auth/login";
import { BoundarySelector } from "./components/BoundarySelector";
import { ChatWindow } from "./components/ChatWindow";
import { ItineraryView } from "./components/ItineraryView";
import { LoginButton } from "./components/LoginButton";
import type { Boundary, Itinerary, User } from "./types";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export function App() {
  const [auth, setAuth] = useState<{ token: string; user: User } | null>(
    () => getStoredAuth(),
  );
  const [boundary, setBoundary] = useState<Boundary>({ level: "city", value: "" });
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      {!auth ? (
        <LoginButton onLogin={setAuth} />
      ) : (
        <div className="app">
          <header className="topbar">
            <div className="brand">AI Trip Planner</div>
            <BoundarySelector boundary={boundary} onChange={setBoundary} />
            <div className="account">
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
            <ChatWindow token={auth.token} boundary={boundary} onItinerary={setItinerary} />
            <ItineraryView itinerary={itinerary} />
          </main>
        </div>
      )}
    </GoogleOAuthProvider>
  );
}
