import type { Itinerary } from "../types";

const TYPE_ICON: Record<string, string> = {
  hotel: "Stay",
  restaurant: "Eat",
  attraction: "See",
};

/** Renders the structured itinerary the agent submits via finalizeItinerary. */
export function ItineraryView({ itinerary }: { itinerary: Itinerary | null }) {
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
      <h2>{itinerary.destination}</h2>
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
    </div>
  );
}
