# Auth module

Purpose: identify the user behind each request using Google OAuth ID tokens.

## How it works

- `authAdapter.ts` defines the `AuthAdapter` interface (`verifyToken -> { userId, email }`) and
  returns the Google OAuth implementation.
- `googleAuth.ts` verifies a Google ID token using `google-auth-library`. The token is issued
  by the frontend after the user completes Google Sign-In.
- `middleware.ts` is the Express guard: it reads the `Authorization: Bearer` header, verifies it
  via the adapter, sets `req.userId` / `req.email`, or responds 401.

## Required environment variables

- `GOOGLE_CLIENT_ID` — your OAuth 2.0 Client ID from Google Cloud Console
