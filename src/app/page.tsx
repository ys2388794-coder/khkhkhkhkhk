import React from "react";
import { db } from "@/db";
import {
  accountInspections,
  searchHistory,
  socialProfiles,
  type AccountInspectionRow,
  type SearchHistoryRow,
  type SocialProfileRow,
} from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/ensure-seeded";
import { scoreAndRankProfiles } from "@/lib/matching-engine";
import { INITIAL_SOCIAL_PROFILES } from "@/lib/seed-data";
import { SocialRadarStudio } from "@/components/SocialRadarStudio";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let profiles: SocialProfileRow[] = [];
  let history: SearchHistoryRow[] = [];
  let inspections: AccountInspectionRow[] = [];

  try {
    await ensureDatabaseSeeded();
    profiles = await db
      .select()
      .from(socialProfiles)
      .orderBy(desc(socialProfiles.authenticityScore));

    history = await db
      .select()
      .from(searchHistory)
      .orderBy(desc(searchHistory.createdAt))
      .limit(8);

    inspections = await db
      .select()
      .from(accountInspections)
      .orderBy(desc(accountInspections.createdAt))
      .limit(8);
  } catch {
    // Graceful fallback before schema push
    profiles = INITIAL_SOCIAL_PROFILES.map((p, idx) => ({
      ...p,
      id: idx + 1,
      recentMedia: p.recentMedia ?? [],
      gender: p.gender ?? "male",
      followersCount: p.followersCount ?? 0,
      followingCount: p.followingCount ?? 0,
      postsCount: p.postsCount ?? 0,
      engagementRate: p.engagementRate ?? "4.5%",
      accountCreatedYear: p.accountCreatedYear ?? 2020,
      isVerifiedPlatform: p.isVerifiedPlatform ?? false,
      authenticityScore: p.authenticityScore ?? 85,
      authenticityStatus: p.authenticityStatus ?? "real",
      authenticityReasons: p.authenticityReasons ?? [],
      isSaved: p.isSaved ?? false,
      createdAt: new Date(),
    }));
  }

  const initialResults = scoreAndRankProfiles(profiles, {});

  return (
    <SocialRadarStudio
      initialResults={initialResults}
      initialHistory={history}
      initialInspections={inspections}
    />
  );
}
