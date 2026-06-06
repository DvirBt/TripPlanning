---
name: itinerary-builder
description: Use when assembling a day-by-day travel itinerary from place search results. Guides pacing, daily structure, budgeting and balance so the final plan is realistic and matches the user's preferences.
---

# Itinerary builder

A method for turning a set of in-boundary places into a balanced, budget-aware itinerary.

## Steps

1. Anchor lodging first. Pick one hotel within budget; its nightly cost multiplied by (days - 1) is a fixed cost. Reserve it across all nights.
2. Shape each day around 2-3 activities, not more, unless the user wants a packed pace. Respect any "pace" preference.
3. Alternate intensity. Pair a big attraction with something lighter (a meal, a walk). Avoid two demanding activities back to back.
4. Place meals sensibly. One restaurant near the day's activities for lunch and one for dinner. Honour dietary preferences (e.g. vegetarian) when choosing.
5. Keep a running cost total. Sum lodging + meals + activity costs. If the total approaches the budget, swap a high price-level place for a cheaper one rather than dropping experiences entirely.
6. Order by geography within a day where possible, so the plan reads as a sensible route.

## Output

Produce the structured itinerary for the finalizeItinerary tool:
- A short summary sentence.
- Days, each with timed items (time, place name, type, location, a one-line note, estimated cost).
- A total estimated cost that stays at or under budget.

## Reminders

- Every place must come from searchPlaces results (inside the boundary). Never invent one.
- Self-contained and informational only. No booking links.