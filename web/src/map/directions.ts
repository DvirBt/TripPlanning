import type { ItineraryItem } from "../types";

export type TravelMode = "DRIVING" | "WALKING" | "TRANSIT";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DirectionsRequestData {
  origin: LatLng;
  destination: LatLng;
  waypoints: LatLng[];
  travelMode: TravelMode;
}

/** Items that have finite coordinates, in their original visit order. */
export function mappableStops(items: ItineraryItem[]): Array<ItineraryItem & LatLng> {
  return items.filter(
    (i): i is ItineraryItem & LatLng =>
      Number.isFinite(i.lat) && Number.isFinite(i.lng),
  );
}

/**
 * Builds a Directions request for one day's stops, or null when there are fewer
 * than two mappable stops (nothing to route between).
 */
export function buildDirectionsRequest(
  items: ItineraryItem[],
  travelMode: TravelMode,
): DirectionsRequestData | null {
  const stops = mappableStops(items);
  if (stops.length < 2) return null;
  const toLatLng = (s: LatLng): LatLng => ({ lat: s.lat, lng: s.lng });
  return {
    origin: toLatLng(stops[0]),
    destination: toLatLng(stops[stops.length - 1]),
    waypoints: stops.slice(1, -1).map(toLatLng),
    travelMode,
  };
}
