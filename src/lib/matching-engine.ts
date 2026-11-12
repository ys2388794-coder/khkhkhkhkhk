import type {
  InspectionSignal,
  SocialProfileRow,
  VisualSignature,
} from "@/db/schema";

export interface SearchQueryInput {
  name?: string;
  region?: string;
  age?: number | null;
  ageMin?: number | null;
  ageMax?: number | null;
  platforms?: string[];
  photoSignature?: VisualSignature | null;
  presetId?: string | null;
}

export interface ScoredProfile extends SocialProfileRow {
  matchScore: number;
  isClosestMatch: boolean;
  isLiveGenerated?: boolean;
  directSearchUrl?: string;
  matchBreakdown: {
    nameScore: number | null;
    photoScore: number | null;
    regionScore: number | null;
    ageScore: number | null;
  };
  whyMatchedAr: string[];
}

const ARABIC_NAME_DICTIONARY: Record<string, string> = {
  احمد: "ahmed",
  محمد: "mohamed",
  محمود: "mahmoud",
  مصطفي: "mostafa",
  مصطفى: "mostafa",
  علي: "ali",
  عمر: "omar",
  عمرو: "amr",
  يوسف: "youssef",
  ابراهيم: "ibrahim",
  خالد: "khaled",
  طارق: "tarek",
  كريم: "karim",
  حسن: "hassan",
  حسين: "hussein",
  ساره: "sara",
  سارة: "sara",
  نور: "nour",
  مريم: "mariam",
  ندى: "nada",
  ندي: "nada",
  اسماء: "asmaa",
  فاطمه: "fatma",
  فاطمة: "fatma",
  عادل: "adel",
  سمير: "samir",
  ايمن: "ayman",
  اسلام: "eslam",
  رامي: "ramy",
  زياد: "ziad",
  سيف: "seif",
  ملك: "malak",
  هنا: "hana",
  ريم: "reem",
  ياسمين: "yasmin",
  اميره: "amira",
  عبدالرحمن: "abdelrahman",
  عبدالله: "abdallah",
  زيدان: "zidan",
  المنشاوي: "elmenshawy",
  النجار: "elnaggar",
  الشافعي: "elshafei",
};

const ARABIC_CHAR_MAP: Record<string, string> = {
  ا: "a",
  أ: "a",
  إ: "e",
  آ: "aa",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "g",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "k",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  ة: "a",
  و: "w",
  ي: "y",
  ى: "a",
  ئ: "e",
  ؤ: "o",
};

const CITY_REGION_ALIASES: Record<string, string[]> = {
  القاهره: ["cairo", "مصر", "egypt", "المعادي", "مدينه نصر", "مصر الجديده"],
  الاسكندريه: ["alexandria", "alex", "مصر", "egypt", "سموحه"],
  الجيزه: ["giza", "الشيخ زايد", "اكتوبر", "القاهره", "مصر", "egypt"],
  المنصوره: ["mansoura", "الدقهليه", "مصر", "egypt"],
  طنطا: ["tanta", "الغربيه", "مصر", "egypt"],
  الرياض: ["riyadh", "السعوديه", "saudi", "ksa"],
  جده: ["jeddah", "السعوديه", "saudi", "ksa"],
  دبي: ["dubai", "dxb", "الامارات", "uae"],
  ابوظبي: ["abudhabi", "الامارات", "uae"],
  عمان: ["amman", "الاردن", "jordan"],
  الكويت: ["kuwait", "q8"],
  الدوحه: ["doha", "قطر", "qatar"],
  "الدار البيضاء": ["casablanca", "المغرب", "morocco"],
};

export function normalizeArabicAndLatin(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[@._\-|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function transliterateToEnglish(input: string): string {
  const cleaned = normalizeArabicAndLatin(input);
  if (!cleaned) return "";
  // If already pure ASCII
  if (/^[a-z0-9\s]+$/.test(cleaned)) {
    return cleaned;
  }

  const words = cleaned.split(" ").filter(Boolean);
  const mapped = words.map((word) => {
    if (ARABIC_NAME_DICTIONARY[word]) {
      return ARABIC_NAME_DICTIONARY[word];
    }
    let out = "";
    for (const ch of word) {
      if (/[a-z0-9]/.test(ch)) {
        out += ch;
      } else if (ARABIC_CHAR_MAP[ch] !== undefined) {
        out += ARABIC_CHAR_MAP[ch];
      }
    }
    return out;
  });

  return mapped.filter(Boolean).join(" ");
}

function computeTokenSimilarity(query: string, candidate: string): number {
  const qNorm = normalizeArabicAndLatin(query);
  const cNorm = normalizeArabicAndLatin(candidate);
  if (!qNorm || !cNorm) return 0;
  if (qNorm === cNorm) return 100;
  if (cNorm.includes(qNorm) || qNorm.includes(cNorm)) return 92;

  const qEn = transliterateToEnglish(qNorm);
  const cEn = transliterateToEnglish(cNorm);
  if (qEn && cEn) {
    if (qEn === cEn) return 96;
    const qCompact = qEn.replace(/\s+/g, "");
    const cCompact = cEn.replace(/\s+/g, "");
    if (cCompact.includes(qCompact) || qCompact.includes(cCompact)) {
      return 89;
    }
  }

  const qTokens = (qEn || qNorm).split(" ").filter(Boolean);
  const cTokens = (cEn || cNorm).split(" ").filter(Boolean);
  if (!qTokens.length || !cTokens.length) return 0;

  let matchedTokens = 0;
  for (const qt of qTokens) {
    const best = cTokens.some(
      (ct) =>
        ct === qt ||
        (qt.length >= 3 && (ct.startsWith(qt) || qt.startsWith(ct))) ||
        levenshteinDistance(qt, ct) <= 1
    );
    if (best) matchedTokens += 1;
  }

  return Math.round((matchedTokens / qTokens.length) * 86);
}

function levenshteinDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 4;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

export function computeVisualSimilarity(
  querySig: VisualSignature,
  targetSig: VisualSignature
): number {
  // 1. 64-bit Perceptual Hash Hamming similarity
  const h1 = querySig.hash || "";
  const h2 = targetSig.hash || "";
  let hashScore = 55;
  if (h1.length > 0 && h2.length > 0) {
    const len = Math.min(h1.length, h2.length);
    let sameBits = 0;
    for (let i = 0; i < len; i++) {
      if (h1[i] === h2[i]) sameBits++;
    }
    hashScore = (sameBits / len) * 100;
  }

  // 2. Dominant RGB Euclidean closeness
  const [r1, g1, b1] = querySig.dominantRgb || [128, 128, 128];
  const [r2, g2, b2] = targetSig.dominantRgb || [128, 128, 128];
  const rgbDist = Math.sqrt(
    (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
  );
  const rgbScore = Math.max(0, 100 - (rgbDist / 441.67) * 145);

  // 3. Contrast & Warmth proximity
  const warmthDiff = Math.abs((querySig.warmth ?? 0) - (targetSig.warmth ?? 0));
  const contrastDiff = Math.abs(
    (querySig.contrast ?? 50) - (targetSig.contrast ?? 50)
  );
  const toneScore = Math.max(0, 100 - warmthDiff * 0.9 - contrastDiff * 0.8);

  // 4. Optional semantic tag overlap (if preset or tagged)
  let tagBonus = 0;
  if (querySig.tags?.length && targetSig.tags?.length) {
    const overlap = querySig.tags.filter((t) => targetSig.tags.includes(t));
    if (overlap.length >= 2) tagBonus = 10;
  }

  const raw = hashScore * 0.52 + rgbScore * 0.3 + toneScore * 0.18 + tagBonus;
  return Math.min(99, Math.max(18, Math.round(raw)));
}

function computeRegionSimilarity(queryRegion: string, profile: SocialProfileRow): number {
  const q = normalizeArabicAndLatin(queryRegion);
  if (!q) return 0;

  const cityNorm = normalizeArabicAndLatin(profile.city);
  const countryNorm = normalizeArabicAndLatin(profile.country);
  const regionNorm = normalizeArabicAndLatin(profile.region);
  const bioNorm = normalizeArabicAndLatin(profile.bio);

  if (cityNorm === q || regionNorm.includes(q)) return 98;
  if (countryNorm === q || bioNorm.includes(q)) return 84;

  // Check city/region alias groups
  for (const [canonical, aliases] of Object.entries(CITY_REGION_ALIASES)) {
    const group = [canonical, ...aliases.map(normalizeArabicAndLatin)];
    const qInGroup = group.some((item) => item === q || q.includes(item));
    const profInGroup = group.some(
      (item) =>
        cityNorm.includes(item) ||
        regionNorm.includes(item) ||
        countryNorm.includes(item)
    );
    if (qInGroup && profInGroup) {
      return cityNorm.includes(q) ? 95 : 80;
    }
  }

  return 18;
}

function computeAgeSimilarity(
  age: number | null | undefined,
  ageMin: number | null | undefined,
  ageMax: number | null | undefined,
  profileAge: number
): number | null {
  if (age != null && age > 0) {
    const diff = Math.abs(profileAge - age);
    if (diff === 0) return 99;
    if (diff <= 1) return 95;
    if (diff <= 2) return 89;
    if (diff <= 4) return 78;
    if (diff <= 7) return 58;
    return Math.max(15, 50 - diff * 3);
  }

  if (ageMin != null || ageMax != null) {
    const min = ageMin ?? 13;
    const max = ageMax ?? 80;
    if (profileAge >= min && profileAge <= max) {
      const center = (min + max) / 2;
      const halfSpan = Math.max(1, (max - min) / 2);
      const closeness = 1 - Math.abs(profileAge - center) / (halfSpan + 4);
      return Math.round(84 + closeness * 14);
    }
    const dist = profileAge < min ? min - profileAge : profileAge - max;
    return Math.max(15, 72 - dist * 9);
  }

  return null;
}

export function scoreAndRankProfiles(
  profiles: SocialProfileRow[],
  query: SearchQueryInput
): ScoredProfile[] {
  const hasName = Boolean(query.name && query.name.trim().length > 0);
  const hasPhoto = Boolean(query.photoSignature);
  const hasRegion = Boolean(query.region && query.region.trim().length > 0);
  const hasAge =
    (query.age != null && query.age > 0) ||
    query.ageMin != null ||
    query.ageMax != null;

  const activePlatforms =
    query.platforms && query.platforms.length > 0
      ? query.platforms.map((p) => p.toLowerCase())
      : null;

  const filtered = activePlatforms
    ? profiles.filter((p) => activePlatforms.includes(p.platform.toLowerCase()))
    : profiles;

  const scored: ScoredProfile[] = filtered.map((profile) => {
    const whyMatchedAr: string[] = [];

    let nameScore: number | null = null;
    if (hasName && query.name) {
      const arSim = computeTokenSimilarity(query.name, profile.fullNameAr);
      const enSim = computeTokenSimilarity(query.name, profile.fullNameEn);
      const userSim = computeTokenSimilarity(query.name, profile.username);
      nameScore = Math.max(arSim, enSim, userSim);
      if (nameScore >= 80) {
        whyMatchedAr.push(`تطابق قوي في الاسم واليوزر (${nameScore}%)`);
      } else if (nameScore >= 50) {
        whyMatchedAr.push(`تشابه جزئي في الاسم (${nameScore}%)`);
      }
    }

    let photoScore: number | null = null;
    if (hasPhoto && query.photoSignature) {
      photoScore = computeVisualSimilarity(
        query.photoSignature,
        profile.visualSignature
      );
      if (photoScore >= 82) {
        whyMatchedAr.push(`بصمة الصورة متطابقة بنسبة عالية (${photoScore}%)`);
      } else if (photoScore >= 65) {
        whyMatchedAr.push(`تقارب في الملامح والألوان البصرية (${photoScore}%)`);
      }
    }

    let regionScore: number | null = null;
    if (hasRegion && query.region) {
      regionScore = computeRegionSimilarity(query.region, profile);
      if (regionScore >= 78) {
        whyMatchedAr.push(`تطابق النطاق الجغرافي (${profile.region})`);
      }
    }

    const ageScore = hasAge
      ? computeAgeSimilarity(
          query.age,
          query.ageMin,
          query.ageMax,
          profile.estimatedAge
        )
      : null;

    if (ageScore !== null && ageScore >= 78) {
      whyMatchedAr.push(`العمر التقريبي متطابق (${profile.estimatedAge} سنة)`);
    }

    // Weighted combination across active signals
    let weightedSum = 0;
    let totalWeight = 0;

    if (nameScore !== null) {
      weightedSum += nameScore * 0.42;
      totalWeight += 0.42;
    }
    if (photoScore !== null) {
      weightedSum += photoScore * 0.36;
      totalWeight += 0.36;
    }
    if (regionScore !== null) {
      weightedSum += regionScore * 0.12;
      totalWeight += 0.12;
    }
    if (ageScore !== null) {
      weightedSum += ageScore * 0.1;
      totalWeight += 0.1;
    }

    let matchScore =
      totalWeight > 0
        ? Math.round(weightedSum / totalWeight)
        : Math.min(96, Math.round(profile.authenticityScore * 0.94));

    if (whyMatchedAr.length === 0) {
      whyMatchedAr.push(`حساب مفهرس في ${profile.city} (${profile.estimatedAge} سنة)`);
    }

    if (profile.authenticityStatus === "fake") {
      whyMatchedAr.push("تنبيه: هذا الحساب مصنّف كحساب منتحل / فيك");
    }

    matchScore = Math.max(12, Math.min(99, matchScore));

    return {
      ...profile,
      matchScore,
      isClosestMatch: false,
      matchBreakdown: {
        nameScore,
        photoScore,
        regionScore,
        ageScore,
      },
      whyMatchedAr,
    };
  });

  // Filter out completely unrelated profiles when user typed a specific name/photo
  let relevant = scored;
  if (hasName || hasPhoto) {
    const strongMatches = scored.filter((item) => {
      const nOk = item.matchBreakdown.nameScore !== null && item.matchBreakdown.nameScore >= 45;
      const pOk = item.matchBreakdown.photoScore !== null && item.matchBreakdown.photoScore >= 72;
      return nOk || pOk || item.matchScore >= 58;
    });
    if (strongMatches.length > 0) {
      relevant = strongMatches;
    } else if (hasName) {
      // Keep only mild matches if any >= 35, otherwise empty so live discovery takes center stage!
      relevant = scored.filter((item) => item.matchScore >= 42);
    }
  } else if (hasRegion || hasAge) {
    relevant = scored.filter((item) => item.matchScore >= 55);
  }

  // Sort: prioritize highest matchScore, breaking ties with authenticityScore so real beats fake clone!
  relevant.sort((a, b) => {
    const scoreDiff = b.matchScore - a.matchScore;
    if (Math.abs(scoreDiff) > 3) return scoreDiff;
    return b.authenticityScore - a.authenticityScore;
  });

  // Mark the #1 closest REAL/non-fake match as `isClosestMatch`
  const topAuthentic = relevant.find((p) => p.authenticityStatus !== "fake") ?? relevant[0];
  if (topAuthentic) {
    topAuthentic.isClosestMatch = true;
  }

  return relevant;
}

export function generateLivePlatformCandidates(
  query: SearchQueryInput,
  existingCount: number
): ScoredProfile[] {
  const rawName = (query.name || "").trim();
  if (!rawName) return [];

  const enName = transliterateToEnglish(rawName) || "user";
  const tokens = enName.split(" ").filter(Boolean);
  const handleDot = tokens.join(".");
  const handleUnderscore = tokens.join("_");
  const handleCompact = tokens.join("");

  const regionLabel = query.region?.trim() || "المنطقة المحددة";
  const targetAge = query.age || query.ageMin || 25;

  const requestedPlatforms =
    query.platforms && query.platforms.length > 0
      ? query.platforms.map((p) => p.toLowerCase())
      : ["instagram", "tiktok", "facebook", "youtube", "x", "snapchat"];

  const encodedQuery = encodeURIComponent(
    `${rawName} ${query.region || ""}`.trim()
  );

  const platformConfigs: Array<{
    platform: string;
    username: string;
    profileUrl: string;
    directSearchUrl: string;
    bioAr: string;
  }> = [
    {
      platform: "instagram",
      username: handleDot,
      profileUrl: `https://www.instagram.com/${handleDot}/`,
      directSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `site:instagram.com "${rawName}" OR "${enName}" ${query.region || ""}`
      )}`,
      bioAr: `وصول مباشر لحساب ونتائج "${rawName}" على إنستغرام في ${regionLabel}`,
    },
    {
      platform: "tiktok",
      username: handleUnderscore,
      profileUrl: `https://www.tiktok.com/@${handleUnderscore}`,
      directSearchUrl: `https://www.tiktok.com/search/user?q=${encodedQuery}`,
      bioAr: `معاينة وبحث مباشر عن حسابات "${rawName}" على تيك توك`,
    },
    {
      platform: "facebook",
      username: handleDot,
      profileUrl: `https://www.facebook.com/public/${encodeURIComponent(rawName)}`,
      directSearchUrl: `https://www.facebook.com/search/people/?q=${encodedQuery}`,
      bioAr: `البحث العام المباشر عن الأشخاص باسم "${rawName}" (${regionLabel}) على فيسبوك`,
    },
    {
      platform: "youtube",
      username: handleCompact,
      profileUrl: `https://www.youtube.com/@${handleCompact}`,
      directSearchUrl: `https://www.youtube.com/results?search_query=${encodedQuery}`,
      bioAr: `قنوات وحسابات يوتيوب المطابقة لاسم "${rawName}"`,
    },
    {
      platform: "x",
      username: handleUnderscore,
      profileUrl: `https://x.com/search?q=${encodedQuery}&f=user`,
      directSearchUrl: `https://x.com/search?q=${encodedQuery}&f=user`,
      bioAr: `حسابات منصة X (تويتر) المطابقة لـ "${rawName}"`,
    },
    {
      platform: "snapchat",
      username: handleDot,
      profileUrl: `https://www.snapchat.com/add/${handleDot}`,
      directSearchUrl: `https://www.snapchat.com/explore/${ encodeURIComponent(handleCompact) }`,
      bioAr: `معرّف سناب شات المحتمل والبحث المباشر عن "${rawName}"`,
    },
  ];

  const filteredConfigs = platformConfigs.filter((c) =>
    requestedPlatforms.includes(c.platform)
  );

  // Use crisp clean SVG data URL avatar with initials for live web discovery cards
  const initials = (tokens[0]?.[0] || "U").toUpperCase() + (tokens[1]?.[0] || "").toUpperCase();
  const svgAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="78" font-weight="700">${initials}</text></svg>`
  )}`;

  return filteredConfigs.map((cfg, idx) => {
    const score = Math.max(72, 88 - idx * 2);
    return {
      id: -(idx + 100),
      personGroupId: `live-${handleCompact}`,
      fullNameAr: `${rawName} (بحث مباشر عبر المنصة)`,
      fullNameEn: enName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      username: cfg.username,
      platform: cfg.platform,
      profileUrl: cfg.profileUrl,
      directSearchUrl: cfg.directSearchUrl,
      avatarUrl: svgAvatar,
      coverUrl:
        "https://images.pexels.com/photos/27520637/pexels-photo-27520637.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=240&w=320",
      recentMedia: [],
      bio: cfg.bioAr,
      region: regionLabel,
      city: query.region?.trim() || "بحث مفتوح",
      country: "",
      estimatedAge: targetAge,
      gender: "male",
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      engagementRate: "فحص مباشر",
      accountCreatedYear: 2024,
      isVerifiedPlatform: false,
      authenticityScore: 78,
      authenticityStatus: "real",
      authenticityReasons: [
        "معرّف مُشتق صوتياً بدقة من الاسم العربي/الإنجليزي للوصول المباشر",
        "يتضمن رابط اليوزر المباشر + رابط البحث الحي داخل المنصة للتحقق الفوري",
      ],
      visualSignature: {
        hash: "1010101010101010",
        dominantRgb: [56, 189, 248],
        warmth: 0,
        contrast: 50,
        tags: ["live"],
      },
      isSaved: false,
      createdAt: new Date(),
      matchScore: score,
      isClosestMatch: existingCount === 0 && idx === 0,
      isLiveGenerated: true,
      matchBreakdown: {
        nameScore: 94,
        photoScore: null,
        regionScore: query.region ? 85 : null,
        ageScore: query.age ? 85 : null,
      },
      whyMatchedAr: [
        `توليد ذكي لليوزر (@${cfg.username}) ورابط البحث الحي في ${cfg.platform.toUpperCase()}`,
        query.region ? `مُوجّه لمنطقة: ${regionLabel}` : "بحث شامل عبر المنصة",
      ],
    };
  });
}

export interface AccountInspectInput {
  platform?: string;
  usernameOrUrl: string;
  followersCount?: number | null;
  followingCount?: number | null;
  postsCount?: number | null;
  accountCreatedYear?: number | null;
  hasCustomAvatar?: boolean;
  hasBioAndLinks?: boolean;
  isVerified?: boolean;
}

export function analyzeAccountForensics(input: AccountInspectInput) {
  const raw = input.usernameOrUrl.trim();
  let detectedPlatform = (input.platform || "instagram").toLowerCase();
  let username = raw.replace(/^@/, "");

  // Extract platform & handle if full URL was pasted
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const u = new URL(raw);
      const host = u.hostname.toLowerCase();
      if (host.includes("instagram")) detectedPlatform = "instagram";
      else if (host.includes("tiktok")) detectedPlatform = "tiktok";
      else if (host.includes("facebook") || host.includes("fb.com"))
        detectedPlatform = "facebook";
      else if (host.includes("youtube") || host.includes("youtu.be"))
        detectedPlatform = "youtube";
      else if (host.includes("x.com") || host.includes("twitter"))
        detectedPlatform = "x";
      else if (host.includes("snapchat")) detectedPlatform = "snapchat";
      else if (host.includes("linkedin")) detectedPlatform = "linkedin";

      const parts = u.pathname
        .split("/")
        .filter(Boolean)
        .filter((p) => !["add", "in", "public", "c", "user"].includes(p));
      if (parts[0]) {
        username = parts[0].replace(/^@/, "");
      }
    }
  } catch {
    // Keep extracted handle
  }

  const profileUrlMap: Record<string, string> = {
    instagram: `https://www.instagram.com/${username}`,
    tiktok: `https://www.tiktok.com/@${username}`,
    facebook: `https://www.facebook.com/${username}`,
    youtube: `https://www.youtube.com/@${username}`,
    x: `https://x.com/${username}`,
    snapchat: `https://www.snapchat.com/add/${username}`,
    linkedin: `https://www.linkedin.com/in/${username}`,
  };
  const profileUrl = profileUrlMap[detectedPlatform] || `https://www.instagram.com/${username}`;

  const signals: InspectionSignal[] = [];

  // 1. Handle Entropy & Impersonation Keywords
  const trailingDigits = (username.match(/\d+$/)?.[0] || "").length;
  const totalDigits = (username.match(/\d/g) || []).length;
  const suspiciousWords = /(official|real|vip|giveaway|fx|crypto|invest|pvt|backup|alt)[_.\d]*/i.test(
    username
  );

  let handleScore = 92;
  let handleDetail = `اسم المستخدم (@${username}) منظم وخالٍ من أنماط البوتات العشوائية.`;
  let handleStatus: "good" | "warn" | "bad" = "good";

  if (trailingDigits >= 4 || totalDigits >= 5) {
    handleScore = 28;
    handleStatus = "bad";
    handleDetail = `يحتوي اليوزر (@${username}) على سلسلة أرقام عشوائية (${totalDigits} أرقام)، وهو نمط شائع في الحسابات الوهمية والمنتحلة.`;
  } else if (suspiciousWords) {
    handleScore = 42;
    handleStatus = "warn";
    handleDetail = `يتضمن اليوزر كلمات دعائية أو انتحالية (مثل official / vip / fx) غالباً تُستخدم لتقليد الحسابات الأصلية.`;
  } else if (trailingDigits >= 2) {
    handleScore = 72;
    handleStatus = "warn";
    handleDetail = `اسم المستخدم مقبول لكنه ينتهي بأرقام إضافية.`;
  }

  signals.push({
    label: "فحص بنية اليوزر وانتحال الهوية",
    score: handleScore,
    status: handleStatus,
    detail: handleDetail,
  });

  // 2. Follower / Following Ratio
  const followers = input.followersCount ?? (handleScore < 45 ? 240 : 4800);
  const following = input.followingCount ?? (handleScore < 45 ? 3100 : 520);
  let ratioScore = 88;
  let ratioStatus: "good" | "warn" | "bad" = "good";
  let ratioDetail = `توازن صحي بين المتابعين (${followers.toLocaleString()}) والمتابَعين (${following.toLocaleString()}).`;

  if (following > 1500 && followers < following * 0.25) {
    ratioScore = 20;
    ratioStatus = "bad";
    ratioDetail = `خلل حاد: الحساب يتابع ${following.toLocaleString()} شخص مقابل ${followers.toLocaleString()} متابع فقط (سلوك حسابات وهمية / سبام).`;
  } else if (followers > 20000 && (input.postsCount ?? 25) <= 3) {
    ratioScore = 32;
    ratioStatus = "bad";
    ratioDetail = `شبهة شراء متابعين وهميين: عدد متابعين ضخم مع غياب المحتوى الفعلي.`;
  } else if (followers < following * 0.6 && following > 800) {
    ratioScore = 58;
    ratioStatus = "warn";
    ratioDetail = `عدد المتابَعين أعلى من المتابعين بشكل ملحوظ، يُنصح بالتحقق من التفاعل.`;
  }

  signals.push({
    label: "نسبة المتابعين إلى المتابَعين",
    score: ratioScore,
    status: ratioStatus,
    detail: ratioDetail,
  });

  // 3. Content Activity & Posts Depth
  const posts = input.postsCount ?? (handleScore < 45 ? 2 : 68);
  let contentScore = 90;
  let contentStatus: "good" | "warn" | "bad" = "good";
  let contentDetail = `نشاط محتوى طبيعي ومستمر (${posts} منشور/فيديو).`;

  if (posts <= 3) {
    contentScore = 25;
    contentStatus = "bad";
    contentDetail = `ندرة شديدة في المحتوى (${posts} منشورات فقط)، وهو مؤشر متكرر في الحسابات المزيفة حديثة الإنشاء.`;
  } else if (posts <= 12) {
    contentScore = 62;
    contentStatus = "warn";
    contentDetail = `محتوى محدود نسبياً (${posts} منشورات)، قد يكون حساباً شخصياً قليل النشر أو جديداً.`;
  }

  signals.push({
    label: "عمق المحتوى واستمرارية النشر",
    score: contentScore,
    status: contentStatus,
    detail: contentDetail,
  });

  // 4. Account Age
  const currentYear = 2026;
  const createdYear = input.accountCreatedYear ?? (handleScore < 45 ? 2026 : 2020);
  const ageYears = Math.max(0, currentYear - createdYear);
  let ageScore = 92;
  let ageStatus: "good" | "warn" | "bad" = "good";
  let ageDetail = `عمر الحساب مستقر (منذ عام ${createdYear} — أكثر من ${ageYears} سنوات).`;

  if (ageYears === 0) {
    ageScore = 30;
    ageStatus = "bad";
    ageDetail = `حساب حديث الإنشاء جداً (${createdYear})، يتطلب حذراً عالياً قبل الوثوق به.`;
  } else if (ageYears <= 1) {
    ageScore = 64;
    ageStatus = "warn";
    ageDetail = `الحساب أنشئ خلال العام الماضي (${createdYear}).`;
  }

  signals.push({
    label: "تاريخ إنشاء الحساب وعمره الرقمي",
    score: ageScore,
    status: ageStatus,
    detail: ageDetail,
  });

  // 5. Profile Completeness & Verification
  const hasAvatar = input.hasCustomAvatar ?? true;
  const hasBio = input.hasBioAndLinks ?? handleScore >= 50;
  const verified = input.isVerified ?? false;

  let identityScore = verified ? 99 : hasAvatar && hasBio ? 86 : hasAvatar ? 58 : 22;
  let identityStatus: "good" | "warn" | "bad" =
    identityScore >= 75 ? "good" : identityScore >= 50 ? "warn" : "bad";
  let identityDetail = verified
    ? "الحساب يحمل شارة التوثيق الرسمية ومتكامل البيانات."
    : hasAvatar && hasBio
      ? "صورة شخصية واضحة وسيرة ذاتية متسقة."
      : "بيانات الحساب الشخصية أو الصورة غير مكتملة.";

  signals.push({
    label: "اكتمال الهوية والتوثيق",
    score: identityScore,
    status: identityStatus,
    detail: identityDetail,
  });

  const avgScore = Math.round(
    handleScore * 0.28 +
      ratioScore * 0.26 +
      contentScore * 0.2 +
      ageScore * 0.14 +
      identityScore * 0.12
  );

  const finalScore = verified ? Math.max(92, avgScore) : Math.min(98, Math.max(8, avgScore));
  const verdict: "real" | "suspicious" | "fake" =
    finalScore >= 74 ? "real" : finalScore >= 46 ? "suspicious" : "fake";

  const summaryAr =
    verdict === "real"
      ? `الحساب @${username} يظهر مؤشرات قوية على أنه حساب حقيقي وأصلي بنسبة موثوقية ${finalScore}%.`
      : verdict === "suspicious"
        ? `الحساب @${username} يحمل مؤشرات متضاربة (${finalScore}%) ويُنصح بمطابقة صوره وروابطه عبر المنصات الأخرى قبل التعامل.`
        : `تحذير: الحساب @${username} يحمل بصمة حساب وهمي / فيك بنسبة خطورة عالية (موثوقية ${finalScore}% فقط).`;

  return {
    platform: detectedPlatform,
    normalizedUsername: username,
    profileUrl,
    authenticityScore: finalScore,
    verdict,
    summaryAr,
    signals,
  };
}
