# Geo module

Purpose: enforce the PRD's strict border adherence. Given a place and a boundary, decide whether
the place is allowed.

## How it works

`geofence.ts` is a small, pure, well-tested module:
- `isWithinBoundary(place, boundary)` does a case-insensitive match of the place's city, state or
  country against the boundary value, depending on the chosen level. Deterministic, so adherence
  never depends on the language model.
- `partitionByBoundary(places, boundary)` splits a list into inside and outside.
- `describeBoundary(boundary)` produces a human label like "city of Kyoto" for prompts and messages.

## Where it is used

- The places adapter calls it to filter search results (data-layer enforcement).
- The agent's PreToolUse hook calls it to reject a finalized itinerary that contains an
  out-of-bounds place (agent-layer enforcement).

Two independent layers means a place outside the boundary cannot end up in the final itinerary.

Unit tests are in `geofence.test.ts` (`npm run test`).
