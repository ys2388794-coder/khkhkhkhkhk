import { db } from "@/db";
import { socialProfiles } from "@/db/schema";
import { INITIAL_SOCIAL_PROFILES } from "./seed-data";
import { count } from "drizzle-orm";

let seedPromise: Promise<void> | null = null;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      const [{ value }] = await db.select({ value: count() }).from(socialProfiles);
      if (Number(value) === 0) {
        await db.insert(socialProfiles).values(INITIAL_SOCIAL_PROFILES);
      }
    } catch (err) {
      // Reset promise so next call can retry if schema push hadn't completed yet
      seedPromise = null;
      throw err;
    }
  })();

  return seedPromise;
}
