## Itinerary building guide

Follow these rules when assembling a day-by-day plan from searchPlaces results.

### Day structure
- Plan 2-3 activities per day. Respect any pace preference the user has stated.
- Alternate intensity: pair a major attraction with something lighter (a meal, a walk, a market). Avoid two demanding activities back-to-back.
- Place one restaurant near the day's activities for lunch and one for dinner. Honour dietary preferences when choosing.

### Budget tracking
- Keep a running cost total as you add items.
- If the total is approaching the budget, swap a high price-level place for a cheaper alternative rather than cutting experiences entirely.
- Every place's estimatedCost must be realistic (not zero).

### Geography
- Order items within a day so the route makes geographical sense. Avoid unnecessary cross-city travel within one day.

### Finishing the plan
- Every place in the itinerary MUST come from a searchPlaces result. Never invent a place or use one from memory.
- When you are ready to commit the plan, call finalizeItinerary with the complete structured itinerary.
- If finalizeItinerary rejects a place as out-of-bounds, replace it with an in-boundary option from searchPlaces and call finalizeItinerary again.
- The itinerary is self-contained and informational only. No booking links.
