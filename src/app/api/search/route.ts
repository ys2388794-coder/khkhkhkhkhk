import { NextResponse } from "next/server";
import { db } from "@/db";
import { searchHistory, socialProfiles } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/ensure-seeded";
import {
  generateLivePlatformCandidates,
  scoreAndRankProfiles,
  type SearchQueryInput,
} from "@/lib/matching-engine";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();

    const allProfiles = await db
      .select()
      .from(socialProfiles)
      .orderBy(desc(socialProfiles.authenticityScore));

    const recentSearches = await db
      .select()
      .from(searchHistory)
      .orderBy(desc(searchHistory.createdAt))
      .limit(8);

    const ranked = scoreAndRankProfiles(allProfiles, {});

    return NextResponse.json({
      ok: true,
      results: ranked,
      recentSearches,
      totalIndexed: allProfiles.length,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { ok: false, error: "تعذر تحميل بيانات الحسابات" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseSeeded();
    const body = (await request.json()) as SearchQueryInput & {
      recordHistory?: boolean;
    };

    const allProfiles = await db.select().from(socialProfiles);
    const dbMatches = scoreAndRankProfiles(allProfiles, body);

    const liveCandidates =
      body.name && body.name.trim().length >= 2
        ? generateLivePlatformCandidates(body, dbMatches.length)
        : [];

    // Merge indexed matches first, then live cross-platform candidates (avoiding duplicate platform+username)
    const seen = new Set(
      dbMatches.map((m) => `${m.platform}:${m.username.toLowerCase()}`)
    );
    const extraLive = liveCandidates.filter(
      (c) => !seen.has(`${c.platform}:${c.username.toLowerCase()}`)
    );

    const combined = [...dbMatches, ...extraLive];
    const topMatch =
      combined.find((r) => r.authenticityStatus !== "fake") ?? combined[0];

    if (
      body.recordHistory &&
      (body.name?.trim() || body.region?.trim() || body.photoSignature || body.age)
    ) {
      await db.insert(searchHistory).values({
        queryName: body.name?.trim() || (body.photoSignature ? "بحث بصورة شخصية" : "بحث مخصص"),
        queryRegion: body.region?.trim() || "كل المناطق",
        queryAgeMin: body.age ?? body.ageMin ?? null,
        queryAgeMax: body.age ?? body.ageMax ?? null,
        platforms: body.platforms ?? [],
        hasPhoto: Boolean(body.photoSignature),
        resultsCount: combined.length,
        topMatchName: topMatch?.fullNameAr || "",
        topMatchScore: topMatch?.matchScore || 0,
      });
    }

    const recentSearches = await db
      .select()
      .from(searchHistory)
      .orderBy(desc(searchHistory.createdAt))
      .limit(8);

    return NextResponse.json({
      ok: true,
      results: combined,
      indexedCount: dbMatches.length,
      liveCount: extraLive.length,
      closestMatch: topMatch || null,
      recentSearches,
    });
  } catch (error) {
    console.error("POST /api/search error:", error);
    return NextResponse.json(
      { ok: false, error: "حدث خطأ أثناء تنفيذ البحث الذكي" },
      { status: 500 }
    );
  }
}
