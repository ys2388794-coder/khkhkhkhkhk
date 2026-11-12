"use client";

import React from "react";
import {
  CheckCircle2,
  Download,
  FileCode2,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

interface ExportCenterModalProps {
  open: boolean;
  onClose: () => void;
  totalProfiles: number;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
}

export function ExportCenterModal({
  open,
  onClose,
  totalProfiles,
  canInstallPwa,
  onInstallPwa,
}: ExportCenterModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              تحميل النسخ الكاملة والجاهزة (ملف HTML + ملف APK)
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

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            يمكنك تحميل البرنامج بالكامل بنقرة واحدة بالصيغتين المطلوبتين تماماً،
            مُدمجاً بهما محرك البحث بالصورة والاسم والمنطقة والعمر وكاشف الحسابات
            الفيك وقاعدة الحسابات الحالية ({totalProfiles} حساب مفهرس + البحث الحي):
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HTML Standalone Package Card */}
            <div className="rounded-2xl bg-slate-950/80 border border-cyan-500/35 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
                    <FileCode2 className="w-6 h-6" />
                  </span>
                  <span className="rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-bold px-3 py-1">
                    نسخة ملف HTML واحد
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-white mb-2">
                  ملف HTML مستقل وكامل (جاهز للتشغيل)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  ملف واحد{" "}
                  <code className="text-cyan-300">
                    Wasel-SocialRadar-Complete.html
                  </code>{" "}
                  يحتوي على الواجهة العربية الكاملة، رفع الصور وتحليل البصمة،
                  الفلترة بالمنطقة والعمر، كاشف الفيك، ومعاينة الحسابات والروابط
                  بدون الحاجة لأي سيرفر أو تثبيت.
                </p>
                <ul className="space-y-1.5 text-xs text-slate-300 mb-5">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>يعمل فوراً بالضغط المزدوج على الكمبيوتر أو الموبايل</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>يشمل جميع المنصات ونسخ اليوزر والروابط مباشرة</span>
                  </li>
                </ul>
              </div>

              <a
                href="/api/export/html"
                download="Wasel-SocialRadar-Complete.html"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-extrabold text-sm py-3 px-4 shadow-lg transition"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف HTML الكامل (.html)</span>
              </a>
            </div>

            {/* Android APK Package Card */}
            <div className="rounded-2xl bg-slate-950/80 border border-emerald-500/35 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Smartphone className="w-6 h-6" />
                  </span>
                  <span className="rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold px-3 py-1">
                    حزمة أندرويد APK
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-white mb-2">
                  نسخة تطبيق أندرويد (ملف APK جاهز)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  حزمة أندرويد{" "}
                  <code className="text-emerald-300">
                    Wasel-SocialRadar-v1.0.apk
                  </code>{" "}
                  مُجمّعة بالأيقونة الرسمية وملفات{" "}
                  <code className="text-slate-300">AndroidManifest + DEX</code>{" "}
                  ومُدمج بداخلها التطبيق الكامل في{" "}
                  <code className="text-slate-300">assets/www/index.html</code>.
                </p>
                <ul className="space-y-1.5 text-xs text-slate-300 mb-5">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>ملف APK مدمج به كافة البيانات وأدوات كشف الفيك</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>يدعم أيضاً التثبيت الفوري كتطبيق موبايل (WebAPK)</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <a
                  href="/api/export/apk"
                  download="Wasel-SocialRadar-v1.0.apk"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm py-3 px-4 shadow-lg transition"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف الأندرويد (.apk)</span>
                </a>

                {canInstallPwa && (
                  <button
                    type="button"
                    onClick={onInstallPwa}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold text-xs py-2.5 px-3 transition cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>تثبيت فوري كتطبيق على الموبايل الآن</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
