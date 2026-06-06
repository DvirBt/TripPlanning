# Auth module

Purpose: identify the user behind each request. The PRD calls for Google Sign-In via Firebase;
this module hides that behind a small adapter so the rest of the app only depends on
"verify a token, get a user".

## How it works

- `authAdapter.ts` defines the `AuthAdapter` interface (`verifyToken -> { userId, email }`) and
  picks the implementation based on `USE_MOCKS`.
- `mockAuth.ts` (default) treats a bearer token as base64-encoded JSON `{ userId, email }`. The
  frontend mints one at mock login. No network, runs offline.
- `firebaseAuth.ts` is the real path: verify a Firebase ID token with `firebase-admin`. It is
  documented and gated, so the project installs and runs without that dependency in mock mode.
- `middleware.ts` is the Express guard: it reads the `Authorization: Bearer` header, verifies it
  via the active adapter, sets `req.userId` / `req.email`, or responds 401.

## Swap to real Firebase

Set `USE_MOCKS=false`, `npm install firebase-admin -w server`, fill the Firebase env vars, and
implement `verifyIdToken` in `firebaseAuth.ts` (a reference snippet is in the file). The
frontend then sends a real Google ID token instead of the mock token.
