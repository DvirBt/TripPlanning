import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { Itinerary, PlaceType } from "../itinerary/types";
import {
  handleFinalizeItinerary,
  handleGetUserPreferences,
  handleSaveUserPreference,
  handleSearchPlaces,
  handleValidateTripConstraints,
  type TripContext,
} from "./toolHandlers";

export type { TripContext };

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

/** Zod schema for the itinerary the agent submits via finalizeItinerary. */
const itinerarySchema = {
  destination: z.string(),
  summary: z.string(),
  totalEstimatedCost: z.number(),
  currency: z.string().default("USD"),
  days: z.array(
    z.object({
      date: z.string(),
      items: z.array(
        z.object({
          time: z.string(),
          placeName: z.string(),
          placeType: z.enum(["hotel", "restaurant", "attraction"]),
          city: z.string(),
          state: z.string(),
          country: z.string(),
          note: z.string(),
          estimatedCost: z.number(),
        }),
      ),
    }),
  ),
};

/**
 * Builds the in-process MCP server exposing the trip-planning tools (Claude
 * backend). A fresh server is created per request so each tool closes over the
 * right context. The model sees these as mcp__trip__<toolName>.
 */
export function buildTripServer(ctx: TripContext) {
  const searchPlaces = tool(
    "searchPlaces",
    "Search for hotels, restaurants or attractions in the user's destination. " +
      "Results are automatically restricted to the active geographical boundary.",
    {
      location: z.string().describe("City or area to search, e.g. 'Kyoto'"),
      type: z.enum(["hotel", "restaurant", "attraction"]),
      query: z.string().optional().describe("Optional keyword, e.g. 'vegetarian'"),
      maxPriceLevel: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe("Highest price level to include, 1 (budget) to 4 (luxury)"),
    },
    async (args) =>
      text(await handleSearchPlaces(ctx, { ...args, type: args.type as PlaceType })),
  );

  const getUserPreferences = tool(
    "getUserPreferences",
    "Retrieve the current user's saved trip preferences (diet, pace, interests, budget style).",
    {},
    async () => text(handleGetUserPreferences(ctx)),
  );

  const saveUserPreference = tool(
    "saveUserPreference",
    "Save or update a single user preference learned during the conversation, " +
      "so it can personalise future trips.",
    {
      key: z.string().describe("Short preference name, e.g. 'diet'"),
      value: z.string().describe("The preference value, e.g. 'vegetarian'"),
    },
    async (args) => text(handleSaveUserPreference(ctx, args)),
  );

  const validateTripConstraints = tool(
    "validateTripConstraints",
    "Check whether a trip is financially realistic BEFORE planning it. Call " +
      "this once you know budget, days and party size. If not feasible, warn " +
      "the user and offer the returned alternatives instead of an itinerary.",
    {
      origin: z.string().optional(),
      destination: z.string().optional(),
      budget: z.number(),
      days: z.number(),
      partySize: z.number(),
    },
    async (args) => text(handleValidateTripConstraints(args)),
  );

  const finalizeItinerary = tool(
    "finalizeItinerary",
    "Submit the final, self-contained itinerary. Call this only after the user " +
      "is happy with the plan. Every place must be inside the active boundary. " +
      "Do NOT include booking links.",
    itinerarySchema,
    async (args) => text(handleFinalizeItinerary(ctx, args as Itinerary)),
  );

  return createSdkMcpServer({
    name: "trip",
    version: "1.0.0",
    tools: [
      searchPlaces,
      getUserPreferences,
      saveUserPreference,
      validateTripConstraints,
      finalizeItinerary,
    ],
  });
}

/** The fully-qualified tool names the agent is allowed to call. */
export const TRIP_TOOL_NAMES = [
  "mcp__trip__searchPlaces",
  "mcp__trip__getUserPreferences",
  "mcp__trip__saveUserPreference",
  "mcp__trip__validateTripConstraints",
  "mcp__trip__finalizeItinerary",
];
