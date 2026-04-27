import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import type { GameState, TrimesterEvent, Decision } from "@/lib/game/types";

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const games = pgTable("game", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scenarioPresetId: text("scenarioPresetId").notNull(),
  status: text("status", {
    enum: ["in_progress", "ended_success", "ended_fail"],
  })
    .notNull()
    .default("in_progress"),
  endingType: text("endingType"),
  endingSummary: text("endingSummary"),
  currentTrimesterIndex: integer("currentTrimesterIndex").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const trimesters = pgTable(
  "trimester",
  {
    gameId: text("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    trimesterIndex: integer("trimesterIndex").notNull(),
    state: jsonb("state").$type<GameState>().notNull(),
    narrationOpening: text("narrationOpening"),
    narrationClosing: text("narrationClosing"),
    event: jsonb("event").$type<TrimesterEvent | null>(),
    decisions: jsonb("decisions").$type<Decision[]>().notNull().default([]),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.trimesterIndex] })],
);

export const iaCallLog = pgTable("iaCallLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // gameId nullable: validator/advisor calls can happen outside a game
  // context (e.g. preset preview). When set, references games(id).
  gameId: text("gameId").references(() => games.id, { onDelete: "cascade" }),
  trimesterIndex: integer("trimesterIndex"),
  agentRole: text("agentRole", {
    enum: ["game_master_open", "game_master_close", "validator", "advisor"],
  }).notNull(),
  model: text("model").notNull(),
  inputTokensTotal: integer("inputTokensTotal").notNull(),
  inputTokensCached: integer("inputTokensCached").notNull().default(0),
  outputTokens: integer("outputTokens").notNull(),
  costUsd: text("costUsd").notNull(), // stored as string to avoid float drift; format "0.012345"
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
