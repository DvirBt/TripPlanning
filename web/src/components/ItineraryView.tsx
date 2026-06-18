import { useState } from "react";
import type { Itinerary } from "../types";
import { ItineraryMap } from "./ItineraryMap";

const TYPE_ICON: Record<string, string> = {
  hotel: "Stay",
  restaurant: "Eat",
  attraction: "See",
};

type Tab = "itinerary" | "map";

/** Renders the structured itinerary the agent submits via finalizeItinerary. */
export function ItineraryView({ itinerary }: { itinerary: Itinerary | null }) {
  const [tab, setTab] = useState<Tab>("itinerary");

  if (!itinerary) {
    return (
      <div className="itinerary empty">
        <h2>Your itinerary</h2>
        <p>Once you and the agent agree on a plan, it appears here.</p>
      </div>
    );
  }

  return (
    <div className="itinerary">
      <div className="itinerary-header">
        <h2>{itinerary.destination}</h2>
        <div className="view-toggle">
          <button
            className={tab === "itinerary" ? "active" : ""}
            onClick={() => setTab("itinerary")}
          >
            Itinerary
          </button>
          <button className={tab === "map" ? "active" : ""} onClick={() => setTab("map")}>
            Map
          </button>
        </div>
      </div>

      {tab === "map" ? (
        <ItineraryMap itinerary={itinerary} />
      ) : (
        <>
          <p className="summary">{itinerary.summary}</p>
          <p className="total">
            Estimated total: {itinerary.currency} {itinerary.totalEstimatedCost}
          </p>
          {itinerary.days.map((day, i) => (
            <div key={i} className="day">
              <h3>
                Day {i + 1} - {day.date}
              </h3>
              {day.items.map((item, j) => (
                <div key={j} className="item">
                  <span className="tag">{TYPE_ICON[item.placeType] ?? item.placeType}</span>
                  <div className="item-body">
                    <strong>{item.time} - {item.placeName}</strong>
                    <div className="loc">{item.city}, {item.country}</div>
                    <div className="note">{item.note}</div>
                  </div>
                  <span className="cost">
                    {itinerary.currency} {item.estimatedCost}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
