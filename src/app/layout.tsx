import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "وصّل | رادار الهوية الرقمية والبحث عبر السوشيال ميديا",
  description:
    "ابحث عن أي شخص عبر إنستغرام وتيك توك وفيسبوك ويوتيوب عن طريق الصورة والاسم والمنطقة والعمر، مع تحديد أقرب تطابق وكشف الحسابات الفيك وتحميل نسختي HTML و APK.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/app-icon.png",
    apple: "/icons/app-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body
        className={`${cairo.className} bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200`}
      >
        {children}
      </body>
    </html>
  );
}
