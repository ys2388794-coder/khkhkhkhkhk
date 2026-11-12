import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export interface VisualSignature {
  hash: string;
  dominantRgb: [number, number, number];
  warmth: number;
  contrast: number;
  tags: string[];
}

export interface InspectionSignal {
  label: string;
  score: number;
  status: "good" | "warn" | "bad";
  detail: string;
}

export const socialProfiles = pgTable("social_profiles", {
  id: serial("id").primaryKey(),
  personGroupId: text("person_group_id").notNull(),
  fullNameAr: text("full_name_ar").notNull(),
  fullNameEn: text("full_name_en").notNull(),
  username: text("username").notNull(),
  platform: text("platform").notNull(), // instagram | tiktok | facebook | youtube | x | snapchat | linkedin
  profileUrl: text("profile_url").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  coverUrl: text("cover_url").notNull(),
  recentMedia: jsonb("recent_media").$type<string[]>().notNull().default([]),
  bio: text("bio").notNull(),
  region: text("region").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  estimatedAge: integer("estimated_age").notNull(),
  gender: text("gender").notNull().default("male"),
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  postsCount: integer("posts_count").notNull().default(0),
  engagementRate: text("engagement_rate").notNull().default("3.2%"),
  accountCreatedYear: integer("account_created_year").notNull().default(2021),
  isVerifiedPlatform: boolean("is_verified_platform").notNull().default(false),
  authenticityScore: integer("authenticity_score").notNull().default(85),
  authenticityStatus: text("authenticity_status").notNull().default("real"), // real | suspicious | fake
  authenticityReasons: jsonb("authenticity_reasons")
    .$type<string[]>()
    .notNull()
    .default([]),
  visualSignature: jsonb("visual_signature")
    .$type<VisualSignature>()
    .notNull(),
  isSaved: boolean("is_saved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  queryName: text("query_name").notNull().default(""),
  queryRegion: text("query_region").notNull().default(""),
  queryAgeMin: integer("query_age_min"),
  queryAgeMax: integer("query_age_max"),
  platforms: jsonb("platforms").$type<string[]>().notNull().default([]),
  hasPhoto: boolean("has_photo").notNull().default(false),
  resultsCount: integer("results_count").notNull().default(0),
  topMatchName: text("top_match_name").notNull().default(""),
  topMatchScore: integer("top_match_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accountInspections = pgTable("account_inspections", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  usernameOrUrl: text("username_or_url").notNull(),
  normalizedUsername: text("normalized_username").notNull(),
  profileUrl: text("profile_url").notNull(),
  authenticityScore: integer("authenticity_score").notNull(),
  verdict: text("verdict").notNull(), // real | suspicious | fake
  summaryAr: text("summary_ar").notNull(),
  signals: jsonb("signals").$type<InspectionSignal[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SocialProfileRow = typeof socialProfiles.$inferSelect;
export type NewSocialProfileRow = typeof socialProfiles.$inferInsert;
export type SearchHistoryRow = typeof searchHistory.$inferSelect;
export type AccountInspectionRow = typeof accountInspections.$inferSelect;
