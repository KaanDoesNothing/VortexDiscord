import type { BotStats } from "./dashboard";

// Shapes returned by the bot's owner-only API (packages/client/routes/owner).

export interface PresenceConfig {
    status: "online" | "idle" | "dnd" | "invisible";
    type: "Watching" | "Playing" | "Listening" | "Competing" | "Custom";
    text: string;
}

export interface AdminOverview {
    stats: BotStats;
    presence: PresenceConfig;
    disabledCommands: string[];
    owners: string[];
    membersIntent: boolean;
}

export interface AdminGuild {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
    ownerId: string;
    shardId: number;
    joinedAt: string | null;
}

export interface AdminUser {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    bot: boolean;
    createdAt: string;
    blacklisted: boolean;
    data: { balance: number; bank: number; bio: string; likes: number; dislikes: number; dailyStreak: number };
    birthday: { month: number; day: number } | null;
    mutualServers: { id: string; name: string }[];
}

export interface BlacklistEntry {
    id: string;
    type: "user" | "guild";
    reason: string;
    name: string | null;
    createdBy: string | null;
    createdAt: string;
}
