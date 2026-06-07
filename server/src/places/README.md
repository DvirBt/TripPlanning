# Places module

Purpose: supply real-world places (hotels, restaurants, attractions) for the agent to build an
itinerary from, using the Google Places API.

## How it works

- `placesAdapter.ts` defines the `PlacesAdapter` interface. Every query carries the active
  boundary, and the contract guarantees results are inside it.
- `googlePlaces.ts` calls the Google Places Text Search API (v1), maps results to the `Place`
  shape (extracting city/state/country from address components), and applies the boundary
  filter from the `geo` module. Results are sorted by rating.

## Required environment variables

- `GOOGLE_PLACES_API_KEY`
