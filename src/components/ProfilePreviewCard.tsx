"use client";

import React, { useState } from "react";
import {
  BadgeCheck,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ScoredProfile } from "@/lib/matching-engine";
import { getPlatformMeta, PlatformBadge } from "./PlatformBadge";

interface ProfilePreviewCardProps {
  profile: ScoredProfile;
  onInspectDetails: (profile: ScoredProfile) => void;
  onToggleSave?: (profile: ScoredProfile) => void;
}

function formatCompactNumber(num: number): string {
  if (!num || num <= 0) return "مباشر";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("en-US");
}

export function ProfilePreviewCard({
  profile,
  onInspectDetails,
  onToggleSave,
}: ProfilePreviewCardProps) {
  const [copiedField, setCopiedField] = useState<"user" | "url" | null>(null);
  const meta = getPlatformMeta(profile.platform);

  const handleCopy = async (text: string, type: "user" | "url") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(type);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Fallback copy
    }
  };

  const isReal = profile.authenticityStatus === "real";
  const isFake = profile.authenticityStatus === "fake";

  return (
    <article
      className={`group relative flex flex-col rounded-2xl bg-slate-900/90 backdrop-blur-md transition-all duration-300 overflow-hidden ${
        profile.isClosestMatch
          ? "border-2 border-cyan-400/90 shadow-[0_0_35px_-6px_rgba(6,182,212,0.38)]"
          : isFake
            ? "border border-rose-500/40 hover:border-rose-400/70 shadow-lg"
            : "border border-slate-800 hover:border-slate-600/80 shadow-lg"
      }`}
    >
      {/* Top Cover Banner */}
      <div className="relative h-24 w-full overflow-hidden bg-slate-800">
        <img
          src={profile.coverUrl}
          alt=""
          className="h-full w-full object-cover opacity-65 transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-b ${meta.accentGradient} to-slate-900`}
        />

        {/* Top Badges Row */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
          <PlatformBadge platform={profile.platform} />

          <div className="flex items-center gap-1.5">
            {profile.isClosestMatch ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400 text-slate-950 px-2.5 py-1 text-xs font-extrabold shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                الأقرب تطابقاً {profile.matchScore}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/80 border border-cyan-400/40 text-cyan-300 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">
                تطابق {profile.matchScore}%
              </span>
            )}

            {profile.id > 0 && onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(profile)}
                title={profile.isSaved ? "محفوظ في قائمتك" : "حفظ الحساب"}
                className={`p-1.5 rounded-full border backdrop-blur-sm transition ${
                  profile.isSaved
                    ? "bg-amber-400/20 border-amber-400/60 text-amber-300"
                    : "bg-slate-950/60 border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${profile.isSaved ? "fill-amber-300" : ""}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Main Body */}
      <div className="px-4 pb-4 -mt-9 relative z-10 flex-1 flex flex-col">
        {/* Avatar + Fake/Real Status Row */}
        <div className="flex items-end justify-between gap-2 mb-3">
          <div className="relative">
            <img
              src={profile.avatarUrl}
              alt={profile.fullNameAr}
              className={`w-18 h-18 rounded-full object-cover border-4 border-slate-900 ring-2 ${meta.ringClass} bg-slate-800 shadow-md`}
            />
            {profile.isVerifiedPlatform && (
              <span
                title="موثق رسمياً على المنصة"
                className="absolute -bottom-0.5 -left-0.5 rounded-full bg-slate-900 p-0.5 text-sky-400"
              >
                <BadgeCheck className="w-5 h-5 fill-sky-500/20" />
              </span>
            )}
          </div>

          {/* Authenticity Verdict Pill */}
          {isReal ? (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-1.5 text-xs font-extrabold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>حقيقي موثوق ({profile.authenticityScore}%)</span>
            </div>
          ) : isFake ? (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/18 border border-rose-500/45 px-2.5 py-1.5 text-xs font-extrabold text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>حساب فيك / منتحل ({profile.authenticityScore}%)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 px-2.5 py-1.5 text-xs font-extrabold text-amber-300">
              <ShieldQuestion className="w-4 h-4 text-amber-400 shrink-0" />
              <span>مشتبه به ({profile.authenticityScore}%)</span>
            </div>
          )}
        </div>

        {/* Name & Quick Metadata */}
        <div className="mb-2">
          <h3 className="text-base font-extrabold text-white leading-snug line-clamp-1">
            {profile.fullNameAr}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              {profile.region}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="w-3.5 h-3.5 text-indigo-400" />
              العمر: ~{profile.estimatedAge} سنة
            </span>
            {!profile.isLiveGenerated && (
              <span className="text-slate-500">
                منذ {profile.accountCreatedYear}
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-3 min-h-[2.4rem]">
          {profile.bio}
        </p>

        {/* Mini Media Preview Grid (if available) */}
        {profile.recentMedia && profile.recentMedia.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {profile.recentMedia.slice(0, 3).map((mediaUrl, idx) => (
              <div
                key={idx}
                className="h-14 rounded-lg overflow-hidden bg-slate-800 border border-slate-800/80"
              >
                <img
                  src={mediaUrl}
                  alt="منشور حديث"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-950/80 border border-slate-800/90 p-2 text-center mb-3">
          <div>
            <div className="text-xs font-extrabold text-white">
              {formatCompactNumber(profile.followersCount)}
            </div>
            <div className="text-[11px] text-slate-400">متابع</div>
          </div>
          <div className="border-x border-slate-800">
            <div className="text-xs font-extrabold text-white">
              {profile.followingCount > 0
                ? formatCompactNumber(profile.followingCount)
                : "—"}
            </div>
            <div className="text-[11px] text-slate-400">يتابع</div>
          </div>
          <div>
            <div className="text-xs font-extrabold text-cyan-300">
              {profile.postsCount > 0
                ? `${profile.postsCount} (${profile.engagementRate})`
                : profile.engagementRate}
            </div>
            <div className="text-[11px] text-slate-400">منشور / تفاعل</div>
          </div>
        </div>

        {/* Direct Username & URL Reachability Box */}
        <div className="rounded-xl bg-indigo-950/30 border border-indigo-500/25 p-2.5 mb-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] text-slate-400 mb-0.5">
                اسم المستخدم (اليوزر للوصول السريع):
              </span>
              <span
                dir="ltr"
                className="block truncate font-mono text-xs font-bold text-cyan-300 text-left"
              >
                @{profile.username}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(`@${profile.username}`, "user")}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 transition cursor-pointer"
            >
              {copiedField === "user" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>نسخ اليوزر</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-1.5 border-t border-indigo-500/15 flex items-center justify-between gap-2">
            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="min-w-0 flex-1 truncate font-mono text-[11px] text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/40 text-left"
            >
              {profile.profileUrl}
            </a>
            <button
              type="button"
              onClick={() => handleCopy(profile.profileUrl, "url")}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 transition cursor-pointer"
            >
              {copiedField === "url" ? (
                <span className="text-emerald-300">✓ نُسخ الرابط</span>
              ) : (
                <span>نسخ الرابط</span>
              )}
            </button>
          </div>
        </div>

        {/* Match Signals Mini-Tags */}
        {profile.whyMatchedAr.length > 0 && (
          <div className="mb-3 space-y-1">
            {profile.whyMatchedAr.slice(0, 2).map((reason, idx) => (
              <div
                key={idx}
                className={`text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                  reason.includes("تنبيه") || reason.includes("فيك")
                    ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                    : "bg-slate-800/70 text-slate-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="line-clamp-1">{reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Action Buttons */}
        <div className="mt-auto pt-1 flex items-center gap-2">
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs py-2.5 px-3 shadow-md transition"
          >
            <span>فتح الحساب</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {profile.isLiveGenerated && profile.directSearchUrl ? (
            <a
              href={profile.directSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs py-2.5 px-3 transition"
            >
              <span>بحث بالمنصة</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => onInspectDetails(profile)}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs py-2.5 px-3 transition cursor-pointer"
          >
            <ScanFace className="w-3.5 h-3.5 text-cyan-400" />
            <span>الفحص</span>
          </button>
        </div>
      </div>
    </article>
  );
}
