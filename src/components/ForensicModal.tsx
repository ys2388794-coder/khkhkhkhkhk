"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  X,
} from "lucide-react";
import type { ScoredProfile } from "@/lib/matching-engine";
import { PlatformBadge } from "./PlatformBadge";

interface ForensicModalProps {
  profile: ScoredProfile | null;
  allResults: ScoredProfile[];
  onClose: () => void;
}

export function ForensicModal({
  profile,
  allResults,
  onClose,
}: ForensicModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!profile) return null;

  const relatedAccounts = allResults.filter(
    (item) =>
      item.id !== profile.id &&
      item.personGroupId === profile.personGroupId &&
      !profile.personGroupId.endsWith("-fake")
  );

  const copyValue = async (val: string, key: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // ignore
    }
  };

  const isReal = profile.authenticityStatus === "real";
  const isFake = profile.authenticityStatus === "fake";

  const metrics = [
    {
      label: "تشابه الاسم واليوزر",
      val: profile.matchBreakdown.nameScore ?? profile.matchScore,
    },
    {
      label: "تطابق البصمة البصرية والصورة",
      val: profile.matchBreakdown.photoScore,
    },
    {
      label: "تطابق المنطقة الجغرافية",
      val: profile.matchBreakdown.regionScore,
    },
    {
      label: "تقارب الفئة العمرية",
      val: profile.matchBreakdown.ageScore,
    },
  ].filter((m) => m.val !== null) as Array<{ label: string; val: number }>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <PlatformBadge platform={profile.platform} />
            <h3 className="text-base font-extrabold text-white">
              تقرير الهوية الرقمية وفحص الموثوقية
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Identity Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <img
              src={profile.avatarUrl}
              alt={profile.fullNameAr}
              className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="text-lg font-extrabold text-white">
                  {profile.fullNameAr}
                </h4>
                <span className="rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 px-2.5 py-0.5 text-xs font-bold">
                  تطابق {profile.matchScore}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                📍 {profile.region} • العمر المقدر: ~{profile.estimatedAge} سنة •{" "}
                {profile.bio}
              </p>

              {/* Direct Handle & Link */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyValue(`@${profile.username}`, "u")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-mono text-cyan-300 border border-slate-700 cursor-pointer"
                >
                  <span dir="ltr">@{profile.username}</span>
                  {copied === "u" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => copyValue(profile.profileUrl, "l")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <span>{copied === "l" ? "✓ تم نسخ الرابط" : "نسخ رابط الحساب"}</span>
                  <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                </button>
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  <span>فتح الحساب</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Fake vs Real Verdict Card */}
          <div
            className={`rounded-2xl p-4 border ${
              isReal
                ? "bg-emerald-500/10 border-emerald-500/35"
                : isFake
                  ? "bg-rose-500/10 border-rose-500/40"
                  : "bg-amber-500/10 border-amber-500/35"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {isReal ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : isFake ? (
                  <ShieldAlert className="w-6 h-6 text-rose-400" />
                ) : (
                  <ShieldQuestion className="w-6 h-6 text-amber-400" />
                )}
                <div>
                  <h5 className="text-sm font-extrabold text-white">
                    نتيجة كشف الفيك:{" "}
                    {isReal
                      ? "حساب حقيقي موثوق وأصلي"
                      : isFake
                        ? "تحذير! حساب فيك / وهمي منتحل"
                        : "حساب مشتبه به / غير مؤكد"}
                  </h5>
                  <p className="text-xs text-slate-300">
                    درجة الموثوقية الرقمية: {profile.authenticityScore} من 100
                  </p>
                </div>
              </div>
              <span
                className={`text-lg font-black px-3 py-1 rounded-xl ${
                  isReal
                    ? "bg-emerald-500/20 text-emerald-300"
                    : isFake
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {profile.authenticityScore}%
              </span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-200 pr-4 list-disc">
              {profile.authenticityReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>

          {/* Match Breakdown Bars */}
          {metrics.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-sm font-extrabold text-white">
                تفصيل مؤشرات التطابق مع بحثك
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-slate-950/70 border border-slate-800 p-3"
                  >
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-semibold">
                        {m.label}
                      </span>
                      <span className="text-cyan-300 font-extrabold">
                        {m.val}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                        style={{ width: `${m.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Accounts Across Platforms for the Same Person */}
          {relatedAccounts.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-sm font-extrabold text-white">
                حسابات أخرى مرتبطة بنفس الشخص عبر السوشيال ميديا (
                {relatedAccounts.length})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {relatedAccounts.map((acc) => (
                  <a
                    key={`${acc.platform}-${acc.username}`}
                    href={acc.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 p-3 transition"
                  >
                    <div className="min-w-0">
                      <PlatformBadge platform={acc.platform} />
                      <div
                        dir="ltr"
                        className="font-mono text-xs text-cyan-300 font-bold mt-1.5 truncate text-left"
                      >
                        @{acc.username}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
