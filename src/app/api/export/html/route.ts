import { db } from "@/db";
import { socialProfiles } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/ensure-seeded";
import { buildStandaloneHtmlApp } from "@/lib/standalone-html-builder";
import { INITIAL_SOCIAL_PROFILES } from "@/lib/seed-data";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const profiles = await db
      .select()
      .from(socialProfiles)
      .orderBy(desc(socialProfiles.authenticityScore));

    const html = buildStandaloneHtmlApp(profiles);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="Wasel-SocialRadar-Complete.html"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/export/html fallback:", error);
    // Fallback to initial profiles if DB unavailable
    const fallbackRows = INITIAL_SOCIAL_PROFILES.map((p, i) => ({
      ...p,
      id: i + 1,
      recentMedia: p.recentMedia ?? [],
      gender: p.gender ?? "male",
      followersCount: p.followersCount ?? 0,
      followingCount: p.followingCount ?? 0,
      postsCount: p.postsCount ?? 0,
      engagementRate: p.engagementRate ?? "4.0%",
      accountCreatedYear: p.accountCreatedYear ?? 2021,
      isVerifiedPlatform: p.isVerifiedPlatform ?? false,
      authenticityScore: p.authenticityScore ?? 85,
      authenticityStatus: p.authenticityStatus ?? "real",
      authenticityReasons: p.authenticityReasons ?? [],
      isSaved: p.isSaved ?? false,
      createdAt: new Date(),
    }));
    const html = buildStandaloneHtmlApp(fallbackRows);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="Wasel-SocialRadar-Complete.html"',
      },
    });
  }
}
