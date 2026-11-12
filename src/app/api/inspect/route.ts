import { NextResponse } from "next/server";
import { db } from "@/db";
import { accountInspections, socialProfiles } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/ensure-seeded";
import {
  analyzeAccountForensics,
  type AccountInspectInput,
} from "@/lib/matching-engine";
import { desc, ilike } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const recent = await db
      .select()
      .from(accountInspections)
      .orderBy(desc(accountInspections.createdAt))
      .limit(8);

    return NextResponse.json({ ok: true, inspections: recent });
  } catch (error) {
    console.error("GET /api/inspect error:", error);
    return NextResponse.json(
      { ok: false, error: "تعذر جلب سجل الفحص" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseSeeded();
    const body = (await request.json()) as AccountInspectInput;

    if (!body.usernameOrUrl?.trim()) {
      return NextResponse.json(
        { ok: false, error: "يرجى إدخال اسم المستخدم أو رابط الحساب" },
        { status: 400 }
      );
    }

    const baseForensics = analyzeAccountForensics(body);

    // Check if this username is already known in our indexed profiles DB
    const matchedDb = await db
      .select()
      .from(socialProfiles)
      .where(ilike(socialProfiles.username, baseForensics.normalizedUsername))
      .limit(1);

    let finalScore = baseForensics.authenticityScore;
    let finalVerdict = baseForensics.verdict;
    let finalSummary = baseForensics.summaryAr;
    const signals = [...baseForensics.signals];

    if (matchedDb[0] && body.followersCount == null) {
      const known = matchedDb[0];
      finalScore = known.authenticityScore;
      finalVerdict = known.authenticityStatus as "real" | "suspicious" | "fake";
      finalSummary =
        known.authenticityStatus === "real"
          ? `مطابق للفهرس الموثق: حساب ${known.fullNameAr} (@${known.username}) حساب حقيقي بنسبة ${known.authenticityScore}%.`
          : `تحذير من الفهرس الرقمي: الحساب @${known.username} مرصود كحساب ${
              known.authenticityStatus === "fake" ? "فيك / منتحل" : "مشتبه به"
            } (${known.authenticityScore}%).`;

      for (const reason of known.authenticityReasons) {
        signals.unshift({
          label: "مطابقة الفهرس الرقمي عبر المنصات",
          score: known.authenticityScore,
          status:
            known.authenticityStatus === "real"
              ? "good"
              : known.authenticityStatus === "suspicious"
                ? "warn"
                : "bad",
          detail: reason,
        });
      }
    }

    const [saved] = await db
      .insert(accountInspections)
      .values({
        platform: baseForensics.platform,
        usernameOrUrl: body.usernameOrUrl.trim(),
        normalizedUsername: baseForensics.normalizedUsername,
        profileUrl: baseForensics.profileUrl,
        authenticityScore: finalScore,
        verdict: finalVerdict,
        summaryAr: finalSummary,
        signals: signals.slice(0, 6),
      })
      .returning();

    const recent = await db
      .select()
      .from(accountInspections)
      .orderBy(desc(accountInspections.createdAt))
      .limit(8);

    return NextResponse.json({
      ok: true,
      inspection: saved,
      matchedProfile: matchedDb[0] || null,
      recentInspections: recent,
    });
  } catch (error) {
    console.error("POST /api/inspect error:", error);
    return NextResponse.json(
      { ok: false, error: "حدث خطأ أثناء فحص الحساب" },
      { status: 500 }
    );
  }
}
