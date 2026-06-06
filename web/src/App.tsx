import { useEffect, useState } from "react";
import { getStoredAuth, logout } from "./auth/login";
import { BoundarySelector } from "./components/BoundarySelector";
import { ChatWindow } from "./components/ChatWindow";
import { ItineraryView } from "./components/ItineraryView";
import { LoginButton } from "./components/LoginButton";
import type { Boundary, Itinerary, User } from "./types";

export function App() {
  const [auth, setAuth] = useState<{ token: string; user: User } | null>(null);
  const [boundary, setBoundary] = useState<Boundary>({ level: "city", value: "Kyoto" });
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  if (!auth) {
    return <LoginButton onLogin={setAuth} />;
  }

  return (
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
  );
}
