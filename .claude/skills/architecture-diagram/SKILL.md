---
name: architecture-diagram
description: Create or update a DrawIO diagram of the TripPlanning system architecture. Use when asked to diagram, visualise, or update the system design.
---

# Architecture diagram

Creates or updates `docs/architecture.drawio` — a DrawIO XML file that can be opened in draw.io (desktop or web).

## System components to diagram

**Frontend (React + Vite, port 5173)**
- `LoginButton` → Google OAuth popup → stores access token in localStorage
- `ChatWindow` → sends POST /api/chat (SSE stream) → renders messages
- `ItineraryView` → displays the finalised itinerary

**Backend (Express, port 8787)**
- Auth middleware → verifies Google access token via tokeninfo endpoint (with in-memory cache)
- `agentService` → routes to Gemini or Claude backend based on `AGENT_PROVIDER`
- `geminiService` → Gemini function-calling loop (up to 12 steps)
- `claudeService` → Claude Agent SDK with MCP server + PreToolUse hook
- `toolHandlers` → shared logic for all 5 tools
- `googlePlaces` → calls Google Places Text Search API, filters by boundary
- `geofence` → isWithinBoundary / findBoundaryViolations
- `ragAdapter` + `vectorStore` → in-memory user preference store
- `prompt.ts` → loads system-prompt.md + itinerary-guide.md + constraint-guide.md + search-guide.md

**External services**
- Google OAuth tokeninfo (auth verification)
- Google Places API v1 (place search)
- Gemini API (LLM, default)
- Anthropic Claude API (LLM, alternative)

## DrawIO XML format

DrawIO files are XML. Minimal valid structure:

```xml
<mxfile>
  <diagram name="Page name" id="unique-id">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- shapes here, all with parent="1" unless grouped -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

**Shape cell** (box):
```xml
<mxCell id="2" value="Label" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="80" y="80" width="120" height="40" as="geometry"/>
</mxCell>
```

**Edge** (arrow from id "2" to id "3"):
```xml
<mxCell id="4" value="" edge="1" source="2" target="3" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

**Swimlane / group**:
```xml
<mxCell id="10" value="Frontend" style="swimlane;" vertex="1" parent="1">
  <mxGeometry x="0" y="0" width="300" height="200" as="geometry"/>
</mxCell>
<!-- children use parent="10" and relative coordinates -->
```

## Steps

1. Read `docs/architecture.drawio` if it exists (to update rather than overwrite).
2. Lay out components in three swimlane columns: Frontend | Backend | External Services.
3. Draw arrows for data flows: login, /api/chat SSE, tool calls, API calls.
4. Write the updated XML to `docs/architecture.drawio`.
5. Tell the user to open it in draw.io (https://app.diagrams.net or the desktop app).