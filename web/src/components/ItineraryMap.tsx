import { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import type { Itinerary } from "../types";
import {
  buildDirectionsRequest,
  mappableStops,
  type DirectionsRequestData,
  type LatLng,
  type TravelMode,
} from "../map/directions";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = "trip_planner_day_map";
const TRAVEL_MODES: TravelMode[] = ["DRIVING", "WALKING", "TRANSIT"];

export function ItineraryMap({ itinerary }: { itinerary: Itinerary }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>("DRIVING");

  if (!API_KEY) {
    return (
      <div className="map-missing-key">
        Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable the map.
      </div>
    );
  }

  const day = itinerary.days[dayIndex] ?? itinerary.days[0];
  const items = day?.items ?? [];
  const stops = mappableStops(items);
  const unmapped = items.length - stops.length;
  const request = buildDirectionsRequest(items, travelMode);
  const center = stops[0] ?? { lat: 0, lng: 0 };

  return (
    <div className="itinerary-map">
      <div className="map-controls">
        <div className="day-pills">
          {itinerary.days.map((_, i) => (
            <button
              key={i}
              className={i === dayIndex ? "pill active" : "pill"}
              onClick={() => setDayIndex(i)}
            >
              Day {i + 1}
            </button>
          ))}
        </div>
        <div className="mode-toggle">
          {TRAVEL_MODES.map((m) => (
            <button
              key={m}
              className={m === travelMode ? "mode active" : "mode"}
              onClick={() => setTravelMode(m)}
            >
              {m[0] + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {unmapped > 0 && (
        <p className="map-notice">
          {unmapped} stop{unmapped > 1 ? "s" : ""} on this day {unmapped > 1 ? "have" : "has"} no
          location and {unmapped > 1 ? "are" : "is"} not shown on the map.
        </p>
      )}

      <div className="map-canvas">
        <APIProvider apiKey={API_KEY}>
          <Map
            mapId={MAP_ID}
            defaultCenter={center}
            defaultZoom={12}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {stops.map((s, i) => (
              <AdvancedMarker key={i} position={{ lat: s.lat, lng: s.lng }} title={s.placeName}>
                <div className="map-pin">{i + 1}</div>
              </AdvancedMarker>
            ))}
            <FitBounds stops={stops} />
            <DayRoute request={request} />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

/** Fits the map to the day's stops (or centres + zooms when there is only one). */
function FitBounds({ stops }: { stops: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || stops.length === 0) return;
    if (stops.length === 1) {
      map.setCenter(stops[0]);
      map.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    stops.forEach((s) => bounds.extend(s));
    map.fitBounds(bounds, 64);
  }, [map, stops]);
  return null;
}

/** Draws the real-road route for the day; shows an inline notice on failure. */
function DayRoute({ request }: { request: DirectionsRequestData | null }) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const [service, setService] = useState<google.maps.DirectionsService>();
  const [renderer, setRenderer] = useState<google.maps.DirectionsRenderer>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!routesLib || !map) return;
    setService(new routesLib.DirectionsService());
    const r = new routesLib.DirectionsRenderer({ map, suppressMarkers: true });
    setRenderer(r);
    return () => r.setMap(null);
  }, [routesLib, map]);

  useEffect(() => {
    if (!service || !renderer) return;
    if (!request) {
      renderer.set("directions", null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    service
      .route({
        origin: request.origin,
        destination: request.destination,
        waypoints: request.waypoints.map((location) => ({ location, stopover: true })),
        travelMode: request.travelMode as unknown as google.maps.TravelMode,
        optimizeWaypoints: false,
      })
      .then((result) => {
        if (cancelled) return;
        setFailed(false);
        renderer.setDirections(result);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        renderer.set("directions", null);
      });
    return () => {
      cancelled = true;
    };
  }, [service, renderer, request]);

  if (failed) {
    return <div className="map-error">No route available for this day in this mode — showing stops only.</div>;
  }
  return null;
}
