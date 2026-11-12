import { NextResponse } from "next/server";
import { db } from "@/db";
import { socialProfiles } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/ensure-seeded";
import {
  analyzeAccountForensics,
  transliterateToEnglish,
} from "@/lib/matching-engine";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    await ensureDatabaseSeeded();
    const { id, isSaved } = (await request.json()) as {
      id: number;
      isSaved: boolean;
    };

    if (!id || id < 0) {
      return NextResponse.json(
        { ok: false, error: "معرف الحساب غير صالح للحفظ المباشر" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(socialProfiles)
      .set({ isSaved: Boolean(isSaved) })
      .where(eq(socialProfiles.id, id))
      .returning();

    return NextResponse.json({ ok: true, profile: updated });
  } catch (error) {
    console.error("PATCH /api/profiles error:", error);
    return NextResponse.json(
      { ok: false, error: "تعذر تحديث حالة حفظ الحساب" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseSeeded();
    const body = (await request.json()) as {
      fullNameAr: string;
      username: string;
      platform: string;
      region?: string;
      estimatedAge?: number;
      bio?: string;
      avatarUrl?: string;
      followersCount?: number;
      followingCount?: number;
      postsCount?: number;
    };

    if (!body.fullNameAr?.trim() || !body.username?.trim()) {
      return NextResponse.json(
        { ok: false, error: "يرجى إدخال الاسم واليوزر" },
        { status: 400 }
      );
    }

    const forensics = analyzeAccountForensics({
      platform: body.platform || "instagram",
      usernameOrUrl: body.username,
      followersCount: body.followersCount ?? 1200,
      followingCount: body.followingCount ?? 380,
      postsCount: body.postsCount ?? 35,
      accountCreatedYear: 2022,
      hasCustomAvatar: true,
      hasBioAndLinks: Boolean(body.bio),
    });

    const city = body.region?.split("،")[0]?.trim() || "القاهرة";
    const fullNameEn =
      transliterateToEnglish(body.fullNameAr)
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") || body.username;

    const defaultAvatar =
      body.avatarUrl?.trim() ||
      "https://images.pexels.com/photos/19915587/pexels-photo-19915587.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

    const [inserted] = await db
      .insert(socialProfiles)
      .values({
        personGroupId: `custom-${forensics.normalizedUsername.toLowerCase()}`,
        fullNameAr: body.fullNameAr.trim(),
        fullNameEn,
        username: forensics.normalizedUsername,
        platform: forensics.platform,
        profileUrl: forensics.profileUrl,
        avatarUrl: defaultAvatar,
        coverUrl:
          "https://images.pexels.com/photos/27520637/pexels-photo-27520637.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=240&w=320",
        recentMedia: [
          "https://images.pexels.com/photos/27520637/pexels-photo-27520637.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=240&w=320",
          "https://images.pexels.com/photos/4765851/pexels-photo-4765851.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=240&w=320",
        ],
        bio: body.bio?.trim() || `حساب مضاف للفهرس الرقمي في ${city}`,
        region: body.region?.trim() || "القاهرة، مصر",
        city,
        country: "مصر",
        estimatedAge: Number(body.estimatedAge) || 25,
        gender: "male",
        followersCount: Number(body.followersCount) || 1200,
        followingCount: Number(body.followingCount) || 380,
        postsCount: Number(body.postsCount) || 35,
        engagementRate: "4.2%",
        accountCreatedYear: 2022,
        isVerifiedPlatform: false,
        authenticityScore: forensics.authenticityScore,
        authenticityStatus: forensics.verdict,
        authenticityReasons: forensics.signals.map((s) => s.detail).slice(0, 3),
        visualSignature: {
          hash: "1100110010101010110011001010101011001100101010101100110010101010",
          dominantRgb: [128, 134, 148],
          warmth: 8,
          contrast: 52,
          tags: ["custom"],
        },
        isSaved: true,
      })
      .returning();

    return NextResponse.json({ ok: true, profile: inserted });
  } catch (error) {
    console.error("POST /api/profiles error:", error);
    return NextResponse.json(
      { ok: false, error: "تعذر إضافة الحساب للفهرس" },
      { status: 500 }
    );
  }
}
