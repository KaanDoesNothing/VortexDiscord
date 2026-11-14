import { sql } from "drizzle-orm";
import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

const timestamps = {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
};

export const guilds = pgTable("guilds", {
    id: text("id").primaryKey(),
    prefix: varchar("prefix", { length: 10 }).notNull().default("->"),
    disabledCommands: text("disabled_commands").array().notNull().default(sql`'{}'::text[]`),
    /** Dashboard settings, see lib/settings.ts. Missing keys fall back to defaults. */
    settings: jsonb("settings").notNull().default({}),
    ...timestamps
});

export const customCommands = pgTable("custom_commands", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    name: varchar("name", { length: 32 }).notNull(),
    response: text("response").notNull(),
    /** Send the response as an embed instead of plain text. */
    embed: boolean("embed").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    createdBy: text("created_by"),
    uses: integer("uses").notNull().default(0),
    ...timestamps
}, (table) => [
    uniqueIndex("custom_commands_guild_name_idx").on(table.guildId, table.name)
]);

export const users = pgTable("users", {
    id: text("id").primaryKey(),
    permission: integer("permission").notNull().default(0),
    balance: bigint("balance", { mode: "number" }).notNull().default(500),
    bio: varchar("bio", { length: 100 }).notNull().default("None"),
    likes: integer("likes").notNull().default(0),
    dislikes: integer("dislikes").notNull().default(0),
    dailyClaimedAt: timestamp("daily_claimed_at", { withTimezone: true }),
    // Coins in the bank can't be stolen with /rob.
    bank: bigint("bank", { mode: "number" }).notNull().default(0),
    // Consecutive days /daily was claimed (resets if a day is missed).
    dailyStreak: integer("daily_streak").notNull().default(0),
    // Last use of each cooldown-based economy command: { work: ISO date, crime: ..., rob: ... }.
    cooldowns: jsonb("cooldowns").$type<Record<string, string>>().notNull().default({}),
    ...timestamps
}, (table) => [
    index("users_balance_idx").on(table.balance)
]);

export const guildMembers = pgTable("guild_members", {
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    level: integer("level").notNull().default(1),
    messages: integer("messages").notNull().default(1),
    ...timestamps
}, (table) => [
    primaryKey({ columns: [table.guildId, table.userId] }),
    index("guild_members_leaderboard_idx").on(table.guildId, table.level)
]);

export const modLogs = pgTable("mod_logs", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    type: text("type").notNull(),
    moderatorId: text("moderator_id"),
    targetId: text("target_id"),
    reason: text("reason").notNull().default("None"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
    index("mod_logs_guild_target_idx").on(table.guildId, table.targetId, table.createdAt)
]);

export const commandLogs = pgTable("command_logs", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id"),
    userId: text("user_id").notNull(),
    command: text("command").notNull(),
    parameters: text("parameters").notNull().default(""),
    slash: boolean("slash").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
    index("command_logs_guild_idx").on(table.guildId, table.createdAt),
    index("command_logs_command_idx").on(table.command)
]);

// ---------- Scheduler ----------

// One table for everything that has to happen later: temp-ban expiry, reminders, giveaway endings,
// scheduled announcements. lib/scheduler.ts polls it and runs due tasks.
export const scheduledTasks = pgTable("scheduled_tasks", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: text("type").notNull(),
    guildId: text("guild_id"),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    // For repeating tasks (announcements): minutes between runs.
    repeatMinutes: integer("repeat_minutes"),
    payload: jsonb("payload").notNull().default({}),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
    index("scheduled_tasks_run_at_idx").on(table.runAt),
    index("scheduled_tasks_guild_type_idx").on(table.guildId, table.type)
]);

// ---------- Moderation ----------

// Private notes moderators keep about a user (never shown to the user).
export const modNotes = pgTable("mod_notes", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    targetId: text("target_id").notNull(),
    authorId: text("author_id").notNull(),
    content: varchar("content", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("mod_notes_guild_target_idx").on(table.guildId, table.targetId)]);

// ---------- Engagement ----------

// A message with buttons that give/take roles.
export const rolePanels = pgTable("role_panels", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    title: varchar("title", { length: 256 }).notNull(),
    description: varchar("description", { length: 2000 }).notNull().default(""),
    // [{ roleId, label, emoji? }]
    roles: jsonb("roles").$type<{ roleId: string; label: string; emoji?: string }[]>().notNull().default([]),
    // toggle: pick any number. single: picking one removes the others.
    mode: text("mode").notNull().default("toggle"),
    ...timestamps
}, (table) => [index("role_panels_guild_idx").on(table.guildId)]);

export const giveaways = pgTable("giveaways", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    prize: varchar("prize", { length: 256 }).notNull(),
    winnerCount: integer("winner_count").notNull().default(1),
    hostId: text("host_id").notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    ended: boolean("ended").notNull().default(false),
    entrants: text("entrants").array().notNull().default(sql`'{}'::text[]`),
    winners: text("winners").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("giveaways_guild_idx").on(table.guildId, table.ended)]);

export const polls = pgTable("polls", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    question: varchar("question", { length: 256 }).notNull(),
    options: text("options").array().notNull(),
    authorId: text("author_id").notNull(),
    closed: boolean("closed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

// One vote per user per poll; changing your vote updates the row.
export const pollVotes = pgTable("poll_votes", {
    pollId: integer("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    option: integer("option").notNull()
}, (table) => [primaryKey({ columns: [table.pollId, table.userId] })]);

// Birthdays are per user (shared across servers); each server decides whether to announce them.
export const birthdays = pgTable("birthdays", {
    userId: text("user_id").primaryKey(),
    month: integer("month").notNull(),
    day: integer("day").notNull(),
    ...timestamps
}, (table) => [index("birthdays_date_idx").on(table.month, table.day)]);

// Messages already reposted to the starboard (so each is posted once, then edited).
export const starboardEntries = pgTable("starboard_entries", {
    guildId: text("guild_id").notNull(),
    messageId: text("message_id").notNull(),
    starboardMessageId: text("starboard_message_id").notNull(),
    stars: integer("stars").notNull().default(0)
}, (table) => [primaryKey({ columns: [table.guildId, table.messageId] })]);

// ---------- Utility ----------

export const tickets = pgTable("tickets", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    ownerId: text("owner_id").notNull(),
    topic: varchar("topic", { length: 200 }),
    closed: boolean("closed").notNull().default(false),
    closedBy: text("closed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true })
}, (table) => [
    index("tickets_guild_idx").on(table.guildId, table.closed),
    index("tickets_channel_idx").on(table.channelId)
]);

export const suggestions = pgTable("suggestions", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    authorId: text("author_id").notNull(),
    content: varchar("content", { length: 2000 }).notNull(),
    // open | approved | denied | implemented
    status: text("status").notNull().default("open"),
    response: varchar("response", { length: 1000 }),
    ...timestamps
}, (table) => [index("suggestions_guild_idx").on(table.guildId, table.status)]);

// ---------- Dashboard / stats ----------

// Who changed what in the dashboard (and when).
export const auditLog = pgTable("audit_log", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("audit_log_guild_idx").on(table.guildId, table.createdAt)]);

// Joins and leaves, for the growth chart. Needs the Server Members intent.
export const memberEvents = pgTable("member_events", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    // join | leave
    type: text("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("member_events_guild_idx").on(table.guildId, table.createdAt)]);

// ---------- Bot owner ----------

// Users and servers the bot ignores entirely (set from the owner panel).
export const blacklist = pgTable("blacklist", {
    id: text("id").primaryKey(),
    // user | guild
    type: text("type").notNull(),
    reason: varchar("reason", { length: 500 }).notNull().default(""),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

// Bot-wide key/value settings from the owner panel (status message, globally disabled commands...).
export const botConfig = pgTable("bot_config", {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
});

export type Guild = typeof guilds.$inferSelect;
export type User = typeof users.$inferSelect;
export type GuildMember = typeof guildMembers.$inferSelect;
export type ModLog = typeof modLogs.$inferSelect;
export type CustomCommand = typeof customCommands.$inferSelect;
export type ModLogType = "warn" | "kick" | "ban" | "unban" | "tempban" | "timeout" | "untimeout" | "deafen" | "undeafen" | "automod";
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type RolePanel = typeof rolePanels.$inferSelect;
export type Giveaway = typeof giveaways.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Suggestion = typeof suggestions.$inferSelect;
