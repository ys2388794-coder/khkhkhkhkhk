"use client";

import React from "react";

export interface PlatformMeta {
  id: string;
  nameAr: string;
  nameEn: string;
  badgeClass: string;
  ringClass: string;
  accentGradient: string;
}

export const PLATFORMS_META: Record<string, PlatformMeta> = {
  instagram: {
    id: "instagram",
    nameAr: "إنستغرام",
    nameEn: "Instagram",
    badgeClass:
      "bg-gradient-to-r from-rose-500 via-fuchsia-600 to-amber-500 text-white shadow-sm",
    ringClass: "ring-fuchsia-500/60",
    accentGradient: "from-rose-500/25 via-fuchsia-600/20 to-amber-500/20",
  },
  tiktok: {
    id: "tiktok",
    nameAr: "تيك توك",
    nameEn: "TikTok",
    badgeClass:
      "bg-slate-950 text-cyan-300 border border-cyan-400/50 shadow-sm",
    ringClass: "ring-cyan-400/60",
    accentGradient: "from-cyan-500/25 via-slate-900/40 to-rose-500/25",
  },
  facebook: {
    id: "facebook",
    nameAr: "فيسبوك",
    nameEn: "Facebook",
    badgeClass: "bg-blue-600 text-white shadow-sm",
    ringClass: "ring-blue-500/60",
    accentGradient: "from-blue-600/25 via-indigo-600/15 to-slate-900/20",
  },
  youtube: {
    id: "youtube",
    nameAr: "يوتيوب",
    nameEn: "YouTube",
    badgeClass: "bg-red-600 text-white shadow-sm",
    ringClass: "ring-red-500/60",
    accentGradient: "from-red-600/25 via-rose-600/15 to-slate-900/20",
  },
  x: {
    id: "x",
    nameAr: "منصة إكس",
    nameEn: "X (Twitter)",
    badgeClass: "bg-slate-800 text-slate-100 border border-slate-600/60",
    ringClass: "ring-slate-400/50",
    accentGradient: "from-slate-600/25 via-slate-800/20 to-slate-900/20",
  },
  snapchat: {
    id: "snapchat",
    nameAr: "سناب شات",
    nameEn: "Snapchat",
    badgeClass: "bg-amber-400 text-slate-950 font-extrabold shadow-sm",
    ringClass: "ring-amber-400/60",
    accentGradient: "from-amber-400/25 via-yellow-500/15 to-slate-900/20",
  },
  linkedin: {
    id: "linkedin",
    nameAr: "لينكد إن",
    nameEn: "LinkedIn",
    badgeClass: "bg-sky-600 text-white shadow-sm",
    ringClass: "ring-sky-500/60",
    accentGradient: "from-sky-600/25 via-blue-700/15 to-slate-900/20",
  },
};

export function getPlatformMeta(platform: string): PlatformMeta {
  return (
    PLATFORMS_META[platform.toLowerCase()] ?? {
      id: platform,
      nameAr: platform,
      nameEn: platform,
      badgeClass: "bg-indigo-600 text-white",
      ringClass: "ring-indigo-500/60",
      accentGradient: "from-indigo-600/20 to-cyan-600/20",
    }
  );
}

export function PlatformIcon({
  platform,
  className = "w-4 h-4",
}: {
  platform: string;
  className?: string;
}) {
  const p = platform.toLowerCase();
  if (p === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (p === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
      </svg>
    );
  }
  if (p === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
      </svg>
    );
  }
  if (p === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42a2.5 2.5 0 0 0-1.76 1.77C2 8.76 2 12 2 12s0 3.24.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.42-4.81ZM10 15V9l5.2 3-5.2 3Z" />
      </svg>
    );
  }
  if (p === "x") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (p === "snapchat") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2c3.2 0 5.4 2.1 5.5 5.2 0 1.1-.2 2.2-.3 2.7.3.2.8.4 1.3.5.5.1.8.4.8.8 0 .5-.5.8-1.3 1-.7.2-1.1.5-.9 1.1.4 1.1 1.4 2.1 2.9 2.6.4.1.6.4.5.8-.2.6-1.3 1-2.6 1.2-.3.1-.5.4-.6.9-.1.6-.5.8-1.1.8-.6 0-1.2-.2-2-.2-.9 0-1.5.6-2.2.6s-1.3-.6-2.2-.6c-.8 0-1.4.2-2 .2-.6 0-1-.2-1.1-.8-.1-.5-.3-.8-.6-.9-1.3-.2-2.4-.6-2.6-1.2-.1-.4.1-.7.5-.8 1.5-.5 2.5-1.5 2.9-2.6.2-.6-.2-.9-.9-1.1-.8-.2-1.3-.5-1.3-1 0-.4.3-.7.8-.8.5-.1 1-.3 1.3-.5-.1-.5-.3-1.6-.3-2.7C6.6 4.1 8.8 2 12 2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
    </svg>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const meta = getPlatformMeta(platform);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.badgeClass}`}
    >
      <PlatformIcon platform={platform} className="w-3.5 h-3.5" />
      <span>{meta.nameAr}</span>
    </span>
  );
}
