# Verification

How to confirm the system works end to end. Steps 1-3 need no API key; the full agent flow
(steps 4+) needs a real `ANTHROPIC_API_KEY`.

## Setup

```
npm install
cp .env.example .env     # set ANTHROPIC_API_KEY for the agent steps; keep USE_MOCKS=true
npm run seed             # seed demo-user preferences
npm run dev              # backend on :8787, web on :5173
```

## 1. Backend health and auth (no key needed)

```
curl http://localhost:8787/api/health
# -> {"ok":true,"useMocks":true}
```

Mock login returns a token; using it on /api/preferences shows the seeded preferences:

```
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/session -d '{}' \
  -H 'Content-Type: application/json' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")
curl -s http://localhost:8787/api/preferences -H "Authorization: Bearer $TOKEN"
# -> the four seeded preferences (diet, pace, interests, budget_style)
```

## 2. Unit tests (no key needed)

```
npm run test
# geofence: city/country matching + partition; constraints: $200 USA->Africa flagged infeasible
```

## 3. Graceful failure without a key

With an empty ANTHROPIC_API_KEY, POST /api/chat streams an `error` then `done` event rather
than crashing - confirming the SSE pipeline and error handling.

## 4. Happy path (key needed)

In the web app: sign in (mocked), set boundary = City / Kyoto, then send:
"Plan 3 relaxed days in Kyoto for 2 people, budget $1500, we love temples and street food."

Expect: a couple of clarifying questions if anything is ambiguous, a constraint check, Kyoto-only
suggestions (the seeded vegetarian preference should steer restaurant picks), and a day-by-day
itinerary appearing in the right-hand panel with estimated costs and no booking links.

## 5. Constraint catch (key needed)

Send: "I have $200 to fly from the USA to Africa for a week."
Expect: a graceful explanation that this is unrealistic, with concrete alternatives (raise the
budget, pick a closer destination, shorten the trip). No itinerary is produced.

## 6. Boundary enforcement (key needed)

Set boundary = City / Kyoto and ask for a plan that tempts an out-of-area suggestion (for
example "include a day trip to Tokyo"). The agent should keep everything inside Kyoto. If it
ever tries to finalize an itinerary containing an out-of-bounds place, the PreToolUse hook
denies it (visible as a brief retry) and the agent replaces the place. The data-layer filter in
the places adapter means out-of-area places never even reach the agent.

## 7. RAG updating (key needed)

Tell the agent a new preference, for example "from now on I prefer window seats and boutique
hotels." Then re-check:

```
curl -s http://localhost:8787/api/preferences -H "Authorization: Bearer $TOKEN"
```

The new preference should now be stored, proving dynamic updating.
