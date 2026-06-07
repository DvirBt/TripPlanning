# Verification

How to confirm the system works end to end.

## Setup

```
npm install
cp .env.example .env     # fill in all required keys
npm run seed             # seed demo-user preferences (optional)
npm run dev              # backend on :8787, web on :5173
```

## 1. Backend health

```
curl http://localhost:8787/api/health
# -> {"ok":true}
```

## 2. Unit tests

```
npm run test
# geofence: city/country matching; constraints: $200 USA->Africa flagged infeasible
```

## 3. Happy path

In the web app: sign in with Google, set boundary = City / Prague, then send:
"Plan 3 days in Prague for 2 people, budget $800. We love history and good food."

Expect: a couple of clarifying questions if anything is ambiguous, a constraint check,
Prague-only suggestions pulled from Google Places, and a day-by-day itinerary appearing
in the right-hand panel with restaurants and attractions, estimated costs, and no booking links.

## 4. Hotels on request

After receiving the itinerary, say: "Can you also suggest a hotel?"
Expect: the agent searches for hotels in Prague and presents options separately, without
regenerating the full itinerary.

## 5. Constraint catch

Send: "I have $200 to travel from the USA to Africa for a week."
Expect: a graceful explanation that this is unrealistic, with concrete alternatives.
No itinerary is produced.

## 6. Boundary enforcement

Set boundary = City / Paris and ask the agent to plan. All returned places should be in Paris.
If the agent ever tries to finalize an itinerary containing an out-of-bounds place, the
PreToolUse hook (Claude) or the finalizeItinerary handler (Gemini) rejects it and the agent
corrects itself.

## 7. RAG updating

Tell the agent a new preference, for example "I always prefer vegetarian restaurants."
Then re-check stored preferences:

```
curl -s http://localhost:8787/api/preferences -H "Authorization: Bearer <token>"
```

The new preference should be stored, proving dynamic updating.
