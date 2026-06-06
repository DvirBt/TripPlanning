---
name: constraint-validator
description: Use when a trip request may be financially or physically unrealistic (very low budget, far destination, too many days). Guides how to interpret the validateTripConstraints result and respond gracefully with realistic alternatives.
---

# Constraint validator

A method for judging feasibility and letting the user down gently when a request cannot work.

## When to apply

Whenever you have a budget, a number of days and a party size - and especially when the budget seems low for the distance or duration. Call validateTripConstraints before committing to a plan.

## Interpreting the result

The tool returns `{ feasible, minEstimate, reasons, alternatives }`.

- feasible = true: proceed to build the itinerary, keeping costs under budget.
- feasible = false: do not build an itinerary yet.

## Responding when infeasible

1. Acknowledge the goal warmly - the user is excited about the trip.
2. State the gap plainly using `reasons`: the realistic floor versus their budget, and the biggest driver (usually long-distance travel).
3. Offer the concrete `alternatives` as choices, for example:
   - Raise the budget to about the minimum estimate.
   - Choose a closer destination to cut travel cost.
   - Shorten the trip.
   - Travel with fewer people.
4. Ask which direction they would like to take, then re-validate with the adjusted numbers.

## Tone

Honest and encouraging. Never fabricate a plan that the budget cannot support, and never hide the real cost. A redirected, achievable trip is a better outcome than an impossible promise.