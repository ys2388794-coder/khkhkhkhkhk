import { db } from "@/db";
import { socialProfiles } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/ensure-seeded";
import { buildAndroidApkBuffer } from "@/lib/apk-builder";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const profiles = await db
      .select()
      .from(socialProfiles)
      .orderBy(desc(socialProfiles.authenticityScore));

    const apkBuffer = await buildAndroidApkBuffer(profiles);

    return new Response(new Uint8Array(apkBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition":
          'attachment; filename="Wasel-SocialRadar-v1.0.apk"',
        "Content-Length": String(apkBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/export/apk error:", error);
    return Response.json(
      { ok: false, error: "تعذر توليد حزمة APK" },
      { status: 500 }
    );
  }
}
