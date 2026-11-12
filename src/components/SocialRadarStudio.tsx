"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCode2,
  History,
  ImagePlus,
  Loader2,
  MapPin,
  PlusCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import type {
  AccountInspectionRow,
  SearchHistoryRow,
  VisualSignature,
} from "@/db/schema";
import type { ScoredProfile } from "@/lib/matching-engine";
import { SAMPLE_PHOTO_PRESETS, type SamplePhotoPreset } from "@/lib/seed-data";
import { PlatformBadge, PlatformIcon } from "./PlatformBadge";
import { ProfilePreviewCard } from "./ProfilePreviewCard";
import { ForensicModal } from "./ForensicModal";
import { ExportCenterModal } from "./ExportCenterModal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface SocialRadarStudioProps {
  initialResults: ScoredProfile[];
  initialHistory: SearchHistoryRow[];
  initialInspections: AccountInspectionRow[];
}

const PLATFORM_OPTIONS = [
  { id: "instagram", label: "إنستغرام" },
  { id: "tiktok", label: "تيك توك" },
  { id: "facebook", label: "فيسبوك" },
  { id: "youtube", label: "يوتيوب" },
  { id: "x", label: "إكس X" },
  { id: "snapchat", label: "سناب شات" },
  { id: "linkedin", label: "لينكد إن" },
];

const POPULAR_REGIONS = [
  "القاهرة",
  "الإسكندرية",
  "الجيزة",
  "المنصورة",
  "طنطا",
  "الرياض",
  "جدة",
  "دبي",
  "عمّان",
  "الكويت",
];

function extractVisualSignatureFromImage(img: HTMLImageElement): VisualSignature {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      hash: "1010101010101010101010101010101010101010101010101010101010101010",
      dominantRgb: [128, 128, 128],
      warmth: 0,
      contrast: 50,
      tags: ["uploaded"],
    };
  }

  ctx.drawImage(img, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);
  const grays: number[] = [];
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    rSum += r;
    gSum += g;
    bSum += b;
    grays.push(r * 0.299 + g * 0.587 + b * 0.114);
  }

  const avgGray = grays.reduce((acc, v) => acc + v, 0) / grays.length;
  const hash = grays.map((g) => (g >= avgGray ? "1" : "0")).join("");

  const minG = Math.min(...grays);
  const maxG = Math.max(...grays);
  const contrast = Math.round(((maxG - minG) / 255) * 100);

  const avgR = Math.round(rSum / 64);
  const avgG = Math.round(gSum / 64);
  const avgB = Math.round(bSum / 64);
  const warmth = Math.round((avgR - avgB) * 0.6);

  return {
    hash,
    dominantRgb: [avgR, avgG, avgB],
    warmth,
    contrast,
    tags: ["uploaded"],
  };
}

export function SocialRadarStudio({
  initialResults,
  initialHistory,
  initialInspections,
}: SocialRadarStudioProps) {
  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"radar" | "fakeCheck" | "addAccount">(
    "radar"
  );

  // Search Inputs
  const [queryName, setQueryName] = useState("");
  const [queryRegion, setQueryRegion] = useState("");
  const [queryAge, setQueryAge] = useState<string>("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoSignature, setPhotoSignature] = useState<VisualSignature | null>(
    null
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Results & Filtering
  const [results, setResults] = useState<ScoredProfile[]>(initialResults);
  const [recentSearches, setRecentSearches] =
    useState<SearchHistoryRow[]>(initialHistory);
  const [resultViewFilter, setResultViewFilter] = useState<
    "all" | "real" | "fake" | "saved"
  >("all");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearchedActively, setHasSearchedActively] = useState(false);

  // Modals
  const [selectedProfileModal, setSelectedProfileModal] =
    useState<ScoredProfile | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Fake Account Inspector Tab State
  const [inspectInput, setInspectInput] = useState("");
  const [inspectPlatform, setInspectPlatform] = useState("instagram");
  const [inspectFollowers, setInspectFollowers] = useState("");
  const [inspectFollowing, setInspectFollowing] = useState("");
  const [inspectPosts, setInspectPosts] = useState("");
  const [inspectYear, setInspectYear] = useState("2023");
  const [isInspecting, setIsInspecting] = useState(false);
  const [currentInspection, setCurrentInspection] =
    useState<AccountInspectionRow | null>(initialInspections[0] || null);
  const [recentInspections, setRecentInspections] =
    useState<AccountInspectionRow[]>(initialInspections);

  // Add Account Tab State
  const [newAccName, setNewAccName] = useState("");
  const [newAccUser, setNewAccUser] = useState("");
  const [newAccPlatform, setNewAccPlatform] = useState("instagram");
  const [newAccRegion, setNewAccRegion] = useState("القاهرة، مصر");
  const [newAccAge, setNewAccAge] = useState("25");
  const [newAccBio, setNewAccBio] = useState("");
  const [newAccFollowers, setNewAccFollowers] = useState("2500");
  const [isAddingAcc, setIsAddingAcc] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  };

  const executeSearch = async (options?: {
    overrideName?: string;
    overrideRegion?: string;
    overrideAge?: string;
    overridePhotoSig?: VisualSignature | null;
    overridePlatforms?: string[];
    recordHistory?: boolean;
  }) => {
    setIsSearching(true);
    const nameVal = options?.overrideName ?? queryName;
    const regionVal = options?.overrideRegion ?? queryRegion;
    const ageStr = options?.overrideAge ?? queryAge;
    const sigVal =
      options?.overridePhotoSig !== undefined
        ? options.overridePhotoSig
        : photoSignature;
    const platsVal = options?.overridePlatforms ?? selectedPlatforms;

    const ageNum = ageStr ? parseInt(ageStr, 10) : null;
    const activeCriteria = Boolean(
      nameVal.trim() || regionVal.trim() || sigVal || (ageNum && ageNum > 0)
    );
    setHasSearchedActively(activeCriteria);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameVal,
          region: regionVal,
          age: ageNum && !Number.isNaN(ageNum) ? ageNum : null,
          platforms: platsVal,
          photoSignature: sigVal,
          recordHistory: options?.recordHistory ?? activeCriteria,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults(data.results || []);
        if (data.recentSearches) {
          setRecentSearches(data.recentSearches);
        }
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActivePresetId(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhotoPreviewUrl(dataUrl);
      const img = new Image();
      img.onload = () => {
        const sig = extractVisualSignatureFromImage(img);
        setPhotoSignature(sig);
        executeSearch({ overridePhotoSig: sig, recordHistory: true });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const applySamplePhotoPreset = (preset: SamplePhotoPreset) => {
    setActivePresetId(preset.id);
    setPhotoPreviewUrl(preset.imageUrl);
    setPhotoSignature(preset.signature);
    setQueryName(preset.suggestedName);
    setQueryRegion(preset.suggestedRegion);
    setQueryAge(String(preset.suggestedAge));
    setResultViewFilter("all");

    executeSearch({
      overrideName: preset.suggestedName,
      overrideRegion: preset.suggestedRegion,
      overrideAge: String(preset.suggestedAge),
      overridePhotoSig: preset.signature,
      recordHistory: true,
    });
  };

  const clearAllFilters = () => {
    setQueryName("");
    setQueryRegion("");
    setQueryAge("");
    setSelectedPlatforms([]);
    setPhotoPreviewUrl(null);
    setPhotoSignature(null);
    setActivePresetId(null);
    setResultViewFilter("all");
    setHasSearchedActively(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    executeSearch({
      overrideName: "",
      overrideRegion: "",
      overrideAge: "",
      overridePhotoSig: null,
      overridePlatforms: [],
      recordHistory: false,
    });
  };

  const togglePlatform = (id: string) => {
    const next = selectedPlatforms.includes(id)
      ? selectedPlatforms.filter((p) => p !== id)
      : [...selectedPlatforms, id];
    setSelectedPlatforms(next);
    executeSearch({ overridePlatforms: next, recordHistory: false });
  };

  const handleToggleSaveProfile = async (profile: ScoredProfile) => {
    if (profile.id < 0) return;
    const nextSaved = !profile.isSaved;
    setResults((prev) =>
      prev.map((p) => (p.id === profile.id ? { ...p, isSaved: nextSaved } : p))
    );
    try {
      await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profile.id, isSaved: nextSaved }),
      });
    } catch {
      // ignore
    }
  };

  const handleRunAccountInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectInput.trim()) return;
    setIsInspecting(true);
    try {
      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: inspectPlatform,
          usernameOrUrl: inspectInput,
          followersCount: inspectFollowers ? Number(inspectFollowers) : null,
          followingCount: inspectFollowing ? Number(inspectFollowing) : null,
          postsCount: inspectPosts ? Number(inspectPosts) : null,
          accountCreatedYear: inspectYear ? Number(inspectYear) : null,
        }),
      });
      const data = await res.json();
      if (data.ok && data.inspection) {
        setCurrentInspection(data.inspection);
        if (data.recentInspections) {
          setRecentInspections(data.recentInspections);
        }
      }
    } catch (err) {
      console.error("Inspect failed:", err);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccUser.trim()) return;
    setIsAddingAcc(true);
    setAddSuccessMsg(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullNameAr: newAccName,
          username: newAccUser,
          platform: newAccPlatform,
          region: newAccRegion,
          estimatedAge: Number(newAccAge) || 25,
          bio: newAccBio,
          followersCount: Number(newAccFollowers) || 1200,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAddSuccessMsg(
          `تمت فهرسة حساب @${data.profile.username} وحفظه بنجاح! (نسبة الموثوقية: ${data.profile.authenticityScore}%)`
        );
        setNewAccName("");
        setNewAccUser("");
        setNewAccBio("");
        await executeSearch({ recordHistory: false });
      }
    } catch (err) {
      console.error("Add account failed:", err);
    } finally {
      setIsAddingAcc(false);
    }
  };

  // Filtered counts
  const realCount = results.filter((r) => r.authenticityStatus === "real").length;
  const fakeOrSuspiciousCount = results.filter(
    (r) => r.authenticityStatus !== "real"
  ).length;
  const savedCount = results.filter((r) => r.isSaved).length;

  const displayedResults = results.filter((r) => {
    if (resultViewFilter === "real") return r.authenticityStatus === "real";
    if (resultViewFilter === "fake") return r.authenticityStatus !== "real";
    if (resultViewFilter === "saved") return r.isSaved;
    return true;
  });

  const closestRealMatch = results.find((r) => r.isClosestMatch) || null;
  const detectedFakeInSearch = results.filter(
    (r) => r.authenticityStatus === "fake"
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-x-hidden">
      {/* Subtle Ambient Glows */}
      <div className="pointer-events-none fixed -top-32 right-0 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[130px]" />
      <div className="pointer-events-none fixed top-40 -left-32 w-[480px] h-[480px] rounded-full bg-indigo-600/10 blur-[130px]" />

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/icons/app-icon.png"
              alt="شعار وصّل"
              className="w-11 h-11 rounded-2xl object-cover border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  وصّل <span className="text-cyan-400">| رادار الهوية الرقمية</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                البحث الذكي عن الأشخاص عبر كل منصات السوشيال ميديا وكشف الحسابات الفيك
              </p>
            </div>
          </div>

          {/* Direct Download Actions (HTML + APK) */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/export/html"
              download="Wasel-SocialRadar-Complete.html"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 px-3 py-2 text-xs font-extrabold transition shadow-sm"
            >
              <FileCode2 className="w-4 h-4 text-cyan-400" />
              <span>نسخة HTML كاملة</span>
              <Download className="w-3.5 h-3.5" />
            </a>

            <a
              href="/api/export/apk"
              download="Wasel-SocialRadar-v1.0.apk"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-3.5 py-2 text-xs font-extrabold transition shadow-md"
            >
              <Smartphone className="w-4 h-4" />
              <span>تحميل ملف APK</span>
              <Download className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 text-xs font-bold transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">مركز التحميل</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-7 relative z-10">
        {/* Hero Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("radar")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                activeTab === "radar"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>البحث الذكي بالصورة والاسم والمنطقة والعمر</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("fakeCheck")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                activeTab === "fakeCheck"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>فاحص الحسابات الفيك بالرابط أو اليوزر</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("addAccount")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                activeTab === "addAccount"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة حساب للفهرس</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              متصل بـ إنستغرام • تيك توك • فيسبوك • يوتيوب • إكس • سناب شات
            </span>
          </div>
        </div>

        {/* ===================== TAB 1: SMART RADAR SEARCH ===================== */}
        {activeTab === "radar" && (
          <>
            {/* Search Studio Panel */}
            <section className="rounded-3xl bg-slate-900/90 border border-slate-800/90 p-5 sm:p-7 shadow-2xl space-y-6">
              {/* Photo Upload + Sample Presets Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Photo Upload Dropzone */}
                <div className="lg:col-span-5 rounded-2xl border-2 border-dashed border-cyan-500/40 bg-cyan-950/10 p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {photoPreviewUrl ? (
                      <div className="relative shrink-0">
                        <img
                          src={photoPreviewUrl}
                          alt="الصورة المرفوعة"
                          className="w-18 h-18 rounded-2xl object-cover border-2 border-cyan-400 shadow-lg"
                        />
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 text-slate-950 p-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Camera className="w-7 h-7" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-extrabold text-white mb-0.5">
                        بحث بصورة الشخص (مطابقة الملامح والبصمة البصرية)
                      </h2>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {photoSignature
                          ? "تم استخراج البصمة البصرية (64-bit) ومطابقتها مع صور الحسابات!"
                          : "ارفع صورة للشخص ليقوم البرنامج بمقارنتها وترتيب أقرب الحسابات شبهاً."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 px-3.5 py-2 text-xs font-extrabold cursor-pointer transition">
                      <ImagePlus className="w-4 h-4 text-cyan-300" />
                      <span>
                        {photoPreviewUrl ? "تغيير الصورة" : "اختيار صورة من جهازك"}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                    </label>

                    {photoPreviewUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoPreviewUrl(null);
                            setPhotoSignature(null);
                            setActivePresetId(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                            executeSearch({
                              overridePhotoSig: null,
                              recordHistory: false,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 px-3 py-2 text-xs font-bold cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>

                        {/* External Reverse Visual Search Helpers */}
                        <a
                          href="https://lens.google.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-2 text-[11px] font-semibold transition"
                          title="فحص عكسي إضافي عبر Google Lens"
                        >
                          <span>Google Lens</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Sample Photos for Instant 1-Click Testing */}
                <div className="lg:col-span-7 rounded-2xl bg-slate-950/70 border border-slate-800 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-extrabold text-slate-300">
                      ⚡ جرّب البحث الفوري بصورة وبيانات جاهزة بنقرة واحدة:
                    </span>
                    {activePresetId && (
                      <span className="text-[11px] text-cyan-400 font-bold">
                        تم تفعيل المطابقة الذكية
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {SAMPLE_PHOTO_PRESETS.map((preset) => {
                      const isSelected = activePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applySamplePhotoPreset(preset)}
                          className={`group flex items-center gap-2.5 p-2 rounded-xl border text-right transition cursor-pointer ${
                            isSelected
                              ? "bg-cyan-500/15 border-cyan-400 text-white"
                              : "bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300"
                          }`}
                        >
                          <img
                            src={preset.imageUrl}
                            alt={preset.labelAr}
                            className="w-10 h-10 rounded-full object-cover border border-cyan-400/50 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold truncate">
                              {preset.suggestedName}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {preset.suggestedRegion} • {preset.suggestedAge} سنة
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Search Fields: Name + Region + Age */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSearch({ recordHistory: true });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                  {/* Name or Username */}
                  <div className="md:col-span-5">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      اسم الشخص (بالعربي أو الإنجليزي) أو اليوزر
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={queryName}
                        onChange={(e) => setQueryName(e.target.value)}
                        placeholder="مثال: أحمد طارق، سارة حسن، محمد، أو @username..."
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/90 focus:border-cyan-400 pr-10 pl-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Region / City */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      المنطقة / المحافظة / الدولة المعروفة عنه
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-cyan-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        list="arab-regions-datalist"
                        value={queryRegion}
                        onChange={(e) => setQueryRegion(e.target.value)}
                        placeholder="مثال: القاهرة، الإسكندرية، دبي، الرياض..."
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/90 focus:border-cyan-400 pr-10 pl-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition"
                      />
                      <datalist id="arab-regions-datalist">
                        {POPULAR_REGIONS.map((reg) => (
                          <option key={reg} value={reg} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Age */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      العمر التقريبي للشخص (اختياري)
                    </label>
                    <input
                      type="number"
                      min={13}
                      max={85}
                      value={queryAge}
                      onChange={(e) => setQueryAge(e.target.value)}
                      placeholder="مثال: 25 سنة"
                      className="w-full rounded-xl bg-slate-950 border border-slate-700/90 focus:border-cyan-400 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition"
                    />
                  </div>
                </div>

                {/* Quick Region Chips + Platform Filter Pills */}
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 ml-1">
                      تحديد المواقع:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlatforms([]);
                        executeSearch({
                          overridePlatforms: [],
                          recordHistory: false,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                        selectedPlatforms.length === 0
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      كل السوشيال ميديا
                    </button>

                    {PLATFORM_OPTIONS.map((plat) => {
                      const active = selectedPlatforms.includes(plat.id);
                      return (
                        <button
                          key={plat.id}
                          type="button"
                          onClick={() => togglePlatform(plat.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                            active
                              ? "bg-indigo-500/25 border-indigo-400 text-white shadow-sm"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <PlatformIcon platform={plat.id} className="w-3.5 h-3.5" />
                          <span>{plat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit & Reset Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm px-6 py-3 shadow-lg transition cursor-pointer disabled:opacity-60"
                    >
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span>ابحث وصنّف أقرب الحسابات الآن</span>
                    </button>

                    {(queryName ||
                      queryRegion ||
                      queryAge ||
                      photoPreviewUrl ||
                      selectedPlatforms.length > 0) && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs px-4 py-3 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة ضبط</span>
                      </button>
                    )}
                  </div>

                  {/* Recent Searches Pills */}
                  {recentSearches.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <History className="w-3.5 h-3.5" />
                        آخر عمليات البحث:
                      </span>
                      {recentSearches.slice(0, 3).map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            const n =
                              h.queryName === "بحث بصورة شخصية" ||
                              h.queryName === "بحث مخصص"
                                ? ""
                                : h.queryName;
                            const r =
                              h.queryRegion === "كل المناطق" ? "" : h.queryRegion;
                            setQueryName(n);
                            setQueryRegion(r);
                            setQueryAge(h.queryAgeMin ? String(h.queryAgeMin) : "");
                            executeSearch({
                              overrideName: n,
                              overrideRegion: r,
                              overrideAge: h.queryAgeMin
                                ? String(h.queryAgeMin)
                                : "",
                              recordHistory: false,
                            });
                          }}
                          className="text-[11px] rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 text-slate-300 transition cursor-pointer"
                        >
                          {h.queryName} ({h.resultsCount})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </section>

            {/* Closest #1 Match Spotlight Banner (when user actively searched) */}
            {hasSearchedActively && closestRealMatch && (
              <section className="rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/50 border border-cyan-400/50 p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={closestRealMatch.avatarUrl}
                    alt={closestRealMatch.fullNameAr}
                    className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400 shadow-md shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400 text-slate-950 px-2.5 py-0.5 text-xs font-black">
                        <UserCheck className="w-3.5 h-3.5" />
                        أقرب تطابق حقيقي للشخص ({closestRealMatch.matchScore}%)
                      </span>
                      <PlatformBadge platform={closestRealMatch.platform} />
                      <span className="text-xs font-bold text-emerald-300">
                        ✓ موثوقية الحساب {closestRealMatch.authenticityScore}%
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      {closestRealMatch.fullNameAr}{" "}
                      <span
                        dir="ltr"
                        className="font-mono text-sm text-cyan-300 font-bold mr-1"
                      >
                        @{closestRealMatch.username}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      📍 {closestRealMatch.region} • العمر التقريبي:{" "}
                      {closestRealMatch.estimatedAge} سنة
                      {detectedFakeInSearch.length > 0 && (
                        <span className="text-rose-300 font-bold mr-3">
                          ⚠ تم رصد ({detectedFakeInSearch.length}) حساب فيك/منتحل
                          ينتحل نفس الشخص بالأسفل!
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <a
                    href={closestRealMatch.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs px-4 py-2.5 transition"
                  >
                    <span>الوصول للحساب الأقرب</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedProfileModal(closestRealMatch)}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs px-3.5 py-2.5 transition cursor-pointer"
                  >
                    كل حساباته المرتبطة
                  </button>
                </div>
              </section>
            )}

            {/* Results Classification Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResultViewFilter("all")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    resultViewFilter === "all"
                      ? "bg-slate-100 text-slate-950 border-white"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  كل الحسابات مرتبة بالأقرب ({results.length})
                </button>

                <button
                  type="button"
                  onClick={() => setResultViewFilter("real")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    resultViewFilter === "real"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>حسابات حقيقية موثوقة ({realCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResultViewFilter("fake")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    resultViewFilter === "fake"
                      ? "bg-rose-500/20 text-rose-300 border-rose-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>حسابات فيك / مشبوهة ({fakeOrSuspiciousCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResultViewFilter("saved")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    resultViewFilter === "saved"
                      ? "bg-amber-500/20 text-amber-300 border-amber-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>المحفوظات ({savedCount})</span>
                </button>
              </div>

              <span className="text-xs text-slate-400">
                انقر على أي حساب لنسخ اليوزر أو فتح الرابط مباشرة
              </span>
            </div>

            {/* Profile Preview Cards Grid */}
            {displayedResults.length === 0 ? (
              <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-12 text-center space-y-3">
                <p className="text-base font-bold text-slate-300">
                  لا توجد حسابات مطابقة لهذا التصنيف الفرعي حالياً.
                </p>
                <button
                  type="button"
                  onClick={() => setResultViewFilter("all")}
                  className="rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  عرض جميع النتائج ({results.length})
                </button>
              </div>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedResults.map((profile) => (
                  <ProfilePreviewCard
                    key={`${profile.platform}-${profile.username}-${profile.id}`}
                    profile={profile}
                    onInspectDetails={setSelectedProfileModal}
                    onToggleSave={handleToggleSaveProfile}
                  />
                ))}
              </section>
            )}
          </>
        )}

        {/* ===================== TAB 2: STANDALONE FAKE ACCOUNT INSPECTOR ===================== */}
        {activeTab === "fakeCheck" && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-5">
              <div>
                <h2 className="text-lg font-extrabold text-white mb-1">
                  فاحص كشف الحسابات الوهمية والمنتحلة (Fake Detector)
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ضع رابط أي حساب أو اليوزر من إنستغرام، تيك توك، فيسبوك، أو يوتيوب
                  لمعرفة نسبة موثوقيته وهل هو حساب حقيقي أم فيك.
                </p>
              </div>

              {/* Quick Test Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInspectInput("@ahmed.tarek_official9982");
                    setInspectPlatform("instagram");
                    setInspectFollowers("310");
                    setInspectFollowing("4890");
                    setInspectPosts("3");
                    setInspectYear("2026");
                  }}
                  className="text-xs rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 px-3 py-1.5 font-bold cursor-pointer"
                >
                  تجربة حساب فيك منتحل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInspectInput("@ahmed.tarek.eg");
                    setInspectPlatform("instagram");
                    setInspectFollowers("48200");
                    setInspectFollowing("615");
                    setInspectPosts("284");
                    setInspectYear("2018");
                  }}
                  className="text-xs rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 px-3 py-1.5 font-bold cursor-pointer"
                >
                  تجربة حساب حقيقي موثوق
                </button>
              </div>

              <form onSubmit={handleRunAccountInspect} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      رابط الحساب أو اسم المستخدم (@username)
                    </label>
                    <input
                      type="text"
                      required
                      value={inspectInput}
                      onChange={(e) => setInspectInput(e.target.value)}
                      placeholder="https://instagram.com/... أو @username"
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      المنصة
                    </label>
                    <select
                      value={inspectPlatform}
                      onChange={(e) => setInspectPlatform(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                    >
                      {PLATFORM_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      المتابعون (اختياري)
                    </label>
                    <input
                      type="number"
                      value={inspectFollowers}
                      onChange={(e) => setInspectFollowers(e.target.value)}
                      placeholder="450"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      يتابع (اختياري)
                    </label>
                    <input
                      type="number"
                      value={inspectFollowing}
                      onChange={(e) => setInspectFollowing(e.target.value)}
                      placeholder="3200"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      المنشورات
                    </label>
                    <input
                      type="number"
                      value={inspectPosts}
                      onChange={(e) => setInspectPosts(e.target.value)}
                      placeholder="4"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      سنة الإنشاء
                    </label>
                    <input
                      type="number"
                      value={inspectYear}
                      onChange={(e) => setInspectYear(e.target.value)}
                      placeholder="2025"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isInspecting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-sm py-3 shadow-lg cursor-pointer"
                >
                  {isInspecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>افحص الحساب الآن (حقيقي أم فيك؟)</span>
                </button>
              </form>
            </div>

            {/* Forensic Report Output */}
            <div className="lg:col-span-6 rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-5">
              {currentInspection ? (
                <>
                  <div
                    className={`rounded-2xl p-4 border ${
                      currentInspection.verdict === "real"
                        ? "bg-emerald-500/10 border-emerald-500/40"
                        : currentInspection.verdict === "fake"
                          ? "bg-rose-500/10 border-rose-500/40"
                          : "bg-amber-500/10 border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={currentInspection.platform} />
                        <span
                          dir="ltr"
                          className="font-mono text-sm font-bold text-cyan-300"
                        >
                          @{currentInspection.normalizedUsername}
                        </span>
                      </div>
                      <span className="text-xl font-black text-white">
                        {currentInspection.authenticityScore}%
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white leading-relaxed">
                      {currentInspection.summaryAr}
                    </p>
                    <a
                      href={currentInspection.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-300 underline mt-2"
                    >
                      <span>فتح الرابط المباشر للحساب</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-extrabold text-slate-300">
                      المؤشرات الجنائية الرقمية للحساب:
                    </h4>
                    {currentInspection.signals.map((sig, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-slate-950/80 border border-slate-800 p-3"
                      >
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-white">{sig.label}</span>
                          <span
                            className={
                              sig.status === "good"
                                ? "text-emerald-400"
                                : sig.status === "warn"
                                  ? "text-amber-400"
                                  : "text-rose-400"
                            }
                          >
                            {sig.score}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{sig.detail}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
                  <ShieldCheck className="w-12 h-12 text-cyan-500/50 mb-3" />
                  <p className="text-sm font-bold text-slate-300">
                    أدخل اسم المستخدم أو رابط الحساب لعرض تقرير الفحص المفصل هنا
                  </p>
                </div>
              )}

              {recentInspections.length > 1 && (
                <div className="pt-3 border-t border-slate-800">
                  <span className="block text-xs font-bold text-slate-400 mb-2">
                    عمليات فحص سابقة محفوظة:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recentInspections.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentInspection(item)}
                        className="text-xs rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-slate-300 hover:border-cyan-400/50 cursor-pointer"
                      >
                        @{item.normalizedUsername} ({item.authenticityScore}%)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===================== TAB 3: ADD / INDEX NEW PROFILE ===================== */}
        {activeTab === "addAccount" && (
          <section className="max-w-2xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-white mb-1">
                إضافة وفهرسة حساب جديد في رادار البحث
              </h2>
              <p className="text-xs text-slate-400">
                أي حساب تضيفه هنا يتم فحص موثوقيته وحفظه في قاعدة البيانات ويُدمج
                تلقائياً داخل نسختي <code className="text-cyan-300">HTML</code> و{" "}
                <code className="text-emerald-300">APK</code> عند تحميلهما!
              </p>
            </div>

            {addSuccessMsg && (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3.5 text-xs font-bold text-emerald-300">
                ✓ {addSuccessMsg}
              </div>
            )}

            <form onSubmit={handleAddAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    الاسم الكامل للشخص
                  </label>
                  <input
                    type="text"
                    required
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder="مثال: محمود سامي"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    اليوزر (@username)
                  </label>
                  <input
                    type="text"
                    required
                    value={newAccUser}
                    onChange={(e) => setNewAccUser(e.target.value)}
                    placeholder="mahmoud.samy.eg"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    المنصة
                  </label>
                  <select
                    value={newAccPlatform}
                    onChange={(e) => setNewAccPlatform(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white"
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    المنطقة / المحافظة
                  </label>
                  <input
                    type="text"
                    value={newAccRegion}
                    onChange={(e) => setNewAccRegion(e.target.value)}
                    placeholder="القاهرة، مصر"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    العمر التقريبي
                  </label>
                  <input
                    type="number"
                    value={newAccAge}
                    onChange={(e) => setNewAccAge(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    نبذة الحساب (Bio)
                  </label>
                  <input
                    type="text"
                    value={newAccBio}
                    onChange={(e) => setNewAccBio(e.target.value)}
                    placeholder="وصف مختصر للحساب..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    عدد المتابعين
                  </label>
                  <input
                    type="number"
                    value={newAccFollowers}
                    onChange={(e) => setNewAccFollowers(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingAcc}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-sm py-3 shadow-lg cursor-pointer"
              >
                {isAddingAcc ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                <span>فحص الموثوقية وحفظ الحساب في الفهرس</span>
              </button>
            </form>
          </section>
        )}

        {/* Bottom Ready-Made HTML & APK Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mb-1">
              احصل على نسختك الكاملة والجاهزة الآن (ملف HTML مستقل + ملف APK للأندرويد)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              تم تجهيز التطبيق بالكامل ليعمل على الويب أو كملف{" "}
              <code className="text-cyan-300">HTML</code> واحد يعمل بدون إنترنت أو
              سيرفر، أو كحزمة تطبيق أندرويد{" "}
              <code className="text-emerald-300">APK</code> جاهزة للتثبيت على
              الهاتف.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="/api/export/html"
              download="Wasel-SocialRadar-Complete.html"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-3 transition shadow-md"
            >
              <FileCode2 className="w-4 h-4" />
              <span>تحميل ملف HTML الكامل</span>
            </a>
            <a
              href="/api/export/apk"
              download="Wasel-SocialRadar-v1.0.apk"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-3 transition shadow-md"
            >
              <Smartphone className="w-4 h-4" />
              <span>تحميل ملف APK للأندرويد</span>
            </a>
          </div>
        </section>
      </main>

      {/* Modals */}
      <ForensicModal
        profile={selectedProfileModal}
        allResults={results}
        onClose={() => setSelectedProfileModal(null)}
      />

      <ExportCenterModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        totalProfiles={results.length}
        canInstallPwa={Boolean(deferredPrompt)}
        onInstallPwa={handleInstallPwa}
      />
    </div>
  );
}
