# Places module

Purpose: supply real-world places (hotels, restaurants, attractions) for the agent to build an
itinerary from. This is the PRD's External Integration service for the Google Places API.

## How it works

- `placesAdapter.ts` defines the `PlacesAdapter` interface and selects the implementation based
  on `USE_MOCKS`. Every query carries the active boundary, and the contract guarantees results
  are inside it.
- `mockData.ts` is a small curated dataset (Kyoto, Lisbon, Austin) with each place tagged by
  city/state/country, a price level (1-4) and keyword tags.
- `mockPlaces.ts` (default) filters that dataset by type, optional keyword and price level, then
  applies the boundary filter from the `geo` module. Because the boundary is enforced here, an
  out-of-bounds place can never reach the agent.
- `googlePlaces.ts` is the real path: call the Google Places Text Search API, map results to the
  `Place` shape (deriving city/state/country from address components), then run the same boundary
  filter. Documented and gated behind `USE_MOCKS=false`.

## Swap to real Google Places

Set `USE_MOCKS=false`, provide `GOOGLE_PLACES_API_KEY`, and implement the fetch + mapping in
`googlePlaces.ts` (a reference sketch is in the file). The boundary guarantee carries over
because the same `isWithinBoundary` filter is applied to live results.
