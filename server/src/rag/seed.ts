import { ragAdapter } from "./ragAdapter";

/**
 * Seeds a demo user with a few preferences so RAG visibly shapes the agent's
 * recommendations on first run. Run with: npm run seed
 *
 * Replace DEMO_USER_ID with your own Firebase uid to seed your account.
 */
const DEMO_USER_ID = "demo-user";

const SEED_PREFERENCES: Array<[string, string]> = [
  ["diet", "vegetarian, avoids pork"],
  ["pace", "relaxed, no more than two big activities per day"],
  ["interests", "temples, nature walks, local street food"],
  ["budget_style", "mid-range, willing to splurge on one nice dinner"],
];

for (const [key, value] of SEED_PREFERENCES) {
  ragAdapter.savePreference(DEMO_USER_ID, key, value);
}

console.log(
  `Seeded ${SEED_PREFERENCES.length} preferences for user "${DEMO_USER_ID}".`,
);