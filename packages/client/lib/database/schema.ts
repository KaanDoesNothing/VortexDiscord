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
    // balance, bank, dailyClaimedAt, dailyStreak and cooldowns are legacy: wallets moved to the
    // wallets table (migration 0003 copied them). Kept so nothing is lost; no code reads them.
    dailyClaimedAt: timestamp("daily_claimed_at", { withTimezone: true }),
    bank: bigint("bank", { mode: "number" }).notNull().default(0),
    // Last time they voted for the bot on a bot list (for /vote rewards).
    lastVoteAt: timestamp("last_vote_at", { withTimezone: true }),
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
    // Highest level announced so far (the real level is computed from xp, see lib/leveling.ts).
    level: integer("level").notNull().default(1),
    messages: integer("messages").notNull().default(1),
    xp: bigint("xp", { mode: "number" }).notNull().default(0),
    // Minutes spent in voice that earned XP.
    voiceMinutes: integer("voice_minutes").notNull().default(0),
    ...timestamps
}, (table) => [
    primaryKey({ columns: [table.guildId, table.userId] }),
    index("guild_members_leaderboard_idx").on(table.guildId, table.level),
    index("guild_members_xp_idx").on(table.guildId, table.xp)
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
    // buttons: one button per role. select: a dropdown menu.
    style: text("style").notNull().default("buttons"),
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
    // Ticket type name from the panel menu (null = the default button).
    type: varchar("type", { length: 50 }),
    // Staff member handling it.
    claimedBy: text("claimed_by"),
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

// ---------- Economy ----------

// Balances. scope is "global" (shared by every server in global mode) or a guild ID (server mode).
export const wallets = pgTable("wallets", {
    scope: text("scope").notNull(),
    userId: text("user_id").notNull(),
    balance: bigint("balance", { mode: "number" }).notNull().default(0),
    // Coins in the bank can't be stolen with /rob.
    bank: bigint("bank", { mode: "number" }).notNull().default(0),
    dailyClaimedAt: timestamp("daily_claimed_at", { withTimezone: true }),
    // Consecutive days /daily was claimed (resets if a day is missed).
    dailyStreak: integer("daily_streak").notNull().default(0),
    // Last use of each cooldown-based command: { work: ISO date, crime: ..., rob: ... }.
    cooldowns: jsonb("cooldowns").$type<Record<string, string>>().notNull().default({}),
    ...timestamps
}, (table) => [
    primaryKey({ columns: [table.scope, table.userId] }),
    index("wallets_scope_balance_idx").on(table.scope, table.balance)
]);

// Things a server sells in /shop.
export const shopItems = pgTable("shop_items", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    description: varchar("description", { length: 200 }).notNull().default(""),
    emoji: varchar("emoji", { length: 64 }).notNull().default(""),
    price: bigint("price", { mode: "number" }).notNull(),
    // Buying it gives this role (instead of going in the inventory).
    roleId: text("role_id"),
    // How many are left (null = unlimited).
    stock: integer("stock"),
    // Most one member can own (0 = no limit).
    maxPerUser: integer("max_per_user").notNull().default(0),
    // Only members with this role can buy it.
    requiredRoleId: text("required_role_id"),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps
}, (table) => [index("shop_items_guild_idx").on(table.guildId)]);

export const inventory = pgTable("inventory", {
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    itemId: integer("item_id").notNull().references(() => shopItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0)
}, (table) => [primaryKey({ columns: [table.guildId, table.userId, table.itemId] })]);

// ---------- Roles ----------

// Reacting to a message with an emoji gives a role (removing the reaction takes it away).
export const reactionRoles = pgTable("reaction_roles", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id").notNull(),
    // Unicode emoji, or a custom emoji's ID.
    emoji: text("emoji").notNull(),
    roleId: text("role_id").notNull()
}, (table) => [
    uniqueIndex("reaction_roles_message_emoji_idx").on(table.messageId, table.emoji),
    index("reaction_roles_guild_idx").on(table.guildId)
]);

// ---------- Voice ----------

// "Join to create" channels that exist right now, so they're cleaned up even after a restart.
export const tempVoiceChannels = pgTable("temp_voice_channels", {
    channelId: text("channel_id").primaryKey(),
    guildId: text("guild_id").notNull(),
    ownerId: text("owner_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("temp_voice_guild_idx").on(table.guildId)]);

// ---------- Channels ----------

// Social feeds: new YouTube videos, Twitch streams, Reddit posts and RSS items posted to a channel.
export const feeds = pgTable("feeds", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    // youtube | twitch | reddit | rss
    type: text("type").notNull(),
    // YouTube channel ID, Twitch login, subreddit name or feed URL.
    source: text("source").notNull(),
    // Friendly name shown in lists and messages.
    label: varchar("label", { length: 100 }).notNull().default(""),
    channelId: text("channel_id").notNull(),
    // Message posted with each new item ({title}, {url}, {author} placeholders). Empty = default.
    message: varchar("message", { length: 1000 }).notNull().default(""),
    // Role pinged with each post (optional).
    pingRoleId: text("ping_role_id"),
    // Newest item already posted (video ID, stream ID, post ID...).
    lastItemId: text("last_item_id"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    // Consecutive failed checks; feeds that keep failing are checked less often.
    failures: integer("failures").notNull().default(0),
    ...timestamps
}, (table) => [
    index("feeds_guild_idx").on(table.guildId),
    index("feeds_checked_idx").on(table.lastCheckedAt)
]);

// A message the bot keeps at the bottom of a channel.
export const stickyMessages = pgTable("sticky_messages", {
    channelId: text("channel_id").primaryKey(),
    guildId: text("guild_id").notNull(),
    content: varchar("content", { length: 2000 }).notNull(),
    embed: boolean("embed").notNull().default(false),
    lastMessageId: text("last_message_id"),
    createdBy: text("created_by"),
    ...timestamps
}, (table) => [index("sticky_messages_guild_idx").on(table.guildId)]);

// Replies sent automatically when a message matches a trigger (no prefix needed).
export const autoresponders = pgTable("autoresponders", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    trigger: varchar("trigger", { length: 200 }).notNull(),
    // contains | exact | startsWith | word
    match: text("match").notNull().default("contains"),
    // Text reply (placeholders allowed). Empty = only react.
    response: varchar("response", { length: 2000 }).notNull().default(""),
    embed: boolean("embed").notNull().default(false),
    // Emoji to react with (optional).
    reaction: varchar("reaction", { length: 64 }).notNull().default(""),
    // Only in these channels (empty = everywhere).
    channelIds: text("channel_ids").array().notNull().default(sql`'{}'::text[]`),
    // Per-channel cooldown so it can't be spammed.
    cooldownSeconds: integer("cooldown_seconds").notNull().default(10),
    enabled: boolean("enabled").notNull().default(true),
    uses: integer("uses").notNull().default(0),
    createdBy: text("created_by"),
    ...timestamps
}, (table) => [index("autoresponders_guild_idx").on(table.guildId)]);

// ---------- Invites ----------

// Who invited whom (filled when a member joins, by comparing invite use counts).
export const inviteJoins = pgTable("invite_joins", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    // null = unknown (vanity URL, expired invite, or the bot couldn't tell).
    inviterId: text("inviter_id"),
    code: text("code"),
    // Set when they leave, so invite counts can show people who stayed.
    leftAt: timestamp("left_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
    index("invite_joins_inviter_idx").on(table.guildId, table.inviterId),
    index("invite_joins_user_idx").on(table.guildId, table.userId)
]);

export type Guild = typeof guilds.$inferSelect;
export type User = typeof users.$inferSelect;
export type GuildMember = typeof guildMembers.$inferSelect;
export type ModLog = typeof modLogs.$inferSelect;
export type CustomCommand = typeof customCommands.$inferSelect;
export type ModLogType = "warn" | "kick" | "ban" | "unban" | "tempban" | "softban" | "timeout" | "untimeout" | "deafen" | "undeafen" | "automod";
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type RolePanel = typeof rolePanels.$inferSelect;
export type Giveaway = typeof giveaways.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Suggestion = typeof suggestions.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type ShopItem = typeof shopItems.$inferSelect;
export type ReactionRole = typeof reactionRoles.$inferSelect;
export type Feed = typeof feeds.$inferSelect;
export type StickyMessage = typeof stickyMessages.$inferSelect;
export type Autoresponder = typeof autoresponders.$inferSelect;
