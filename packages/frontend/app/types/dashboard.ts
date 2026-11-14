// Shapes returned by the bot's API (packages/client/routes). Keep in sync with lib/settings.ts there.

export interface GuildSettings {
    commandChannels: { mode: "all" | "allow" | "deny"; channelIds: string[] };
    commandRules: Record<string, { roleIds: string[]; channelIds: string[]; cooldownSeconds: number }>;
    leveling: {
        enabled: boolean;
        messagesPerLevel: number;
        cooldownSeconds: number;
        ignoredChannelIds: string[];
        announce: boolean;
        announceChannelId: string | null;
        message: string;
        rewards: { level: number; roleId: string }[];
        stackRewards: boolean;
    };
    welcome: { enabled: boolean; channelId: string | null; message: string; image: boolean };
    goodbye: { enabled: boolean; channelId: string | null; message: string };
    autoRoleIds: string[];
    modLog: { enabled: boolean; channelId: string | null };
    logs: { messages: string | null; members: string | null; roles: string | null; voice: string | null };
    automod: {
        enabled: boolean;
        blockedWords: string[];
        blockInvites: boolean;
        blockLinks: boolean;
        allowedDomains: string[];
        maxMentions: number;
        spam: { enabled: boolean; messages: number; seconds: number };
        action: "delete" | "warn" | "timeout";
        timeoutMinutes: number;
        exemptRoleIds: string[];
        exemptChannelIds: string[];
    };
    warnThresholds: { count: number; action: "timeout" | "kick" | "ban"; durationMinutes: number }[];
    appeals: { enabled: boolean; message: string };
    starboard: { enabled: boolean; channelId: string | null; emoji: string; threshold: number; allowSelfStar: boolean };
    birthdays: { enabled: boolean; channelId: string | null; message: string };
    tickets: { enabled: boolean; categoryId: string | null; staffRoleIds: string[]; openMessage: string; maxOpenPerUser: number; logChannelId: string | null };
    suggestions: { enabled: boolean; channelId: string | null };
    economy: { currencyName: string; currencyEmoji: string };
}

export interface GuildConfig {
    prefix: string;
    disabledCommands: string[];
    settings: GuildSettings;
}

export interface DashboardUser {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isOwner: boolean;
}

export interface ManageableGuild {
    id: string;
    name: string;
    icon: string | null;
    botPresent: boolean;
}

export interface ChannelOption { id: string; name: string; canSend: boolean }
export interface RoleOption { id: string; name: string; color: string; assignable: boolean }

export interface GuildOverview {
    guild: {
        id: string;
        name: string;
        icon: string | null;
        memberCount: number;
        textChannels: number;
        voiceChannels: number;
        roles: number;
        createdAt: string;
    };
    channels: ChannelOption[];
    categories: { id: string; name: string }[];
    roles: RoleOption[];
    config: GuildConfig;
    placeholders: Record<string, string>;
    features: { membersIntent: boolean };
    stats: {
        commandsTotal: number;
        commands7d: number;
        activeUsers30d: number;
        modActionsTotal: number;
        topCommands: { command: string; uses: number }[];
        usageByDay: { day: string; uses: number }[];
        modActionsByType: { type: string; total: number }[];
    };
}

export interface ResolvedUser { id: string; username: string; avatar: string }

export interface Paginated<T> {
    page: number;
    limit: number;
    total: number;
    users: Record<string, ResolvedUser>;
    rows: T[];
}

export interface ModLogRow { id: number; type: string; moderatorId: string | null; targetId: string | null; reason: string; createdAt: string }
export interface CommandLogRow { id: number; userId: string; command: string; parameters: string; slash: boolean; createdAt: string }
export interface LeaderboardRow { rank: number; userId: string; level: number; messages: number }
export interface AuditRow { id: number; userId: string; action: string; details: Record<string, unknown>; createdAt: string }

export interface CustomCommand {
    id: number;
    name: string;
    response: string;
    embed: boolean;
    enabled: boolean;
    uses: number;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RolePanel {
    id: number;
    channelId: string;
    messageId: string | null;
    title: string;
    description: string;
    mode: "toggle" | "single";
    roles: { roleId: string; label: string; emoji?: string }[];
}

export interface GiveawayRow { id: number; prize: string; channelId: string; winnerCount: number; hostId: string; endsAt: string; ended: boolean; entries: number; winners: string[] }

export interface MessageDraft {
    channelId: string;
    content: string;
    embed: { title: string; description: string; color: string; image?: string; footer?: string } | null;
}

export interface Announcement extends MessageDraft { id: number; runAt: string; repeatMinutes: number | null }

export interface Ticket { id: number; channelId: string; ownerId: string; topic: string | null; closed: boolean; closedBy: string | null; createdAt: string; closedAt: string | null }
export interface Suggestion { id: number; authorId: string; content: string; status: "open" | "approved" | "denied" | "implemented"; response: string | null; createdAt: string }

export interface BotStats {
    bot: { id: string; username: string; avatar: string; uptimeMs: number; readyAt: string | null };
    totals: { guilds: number; users: number; channels: number; commands: number; shards: number; ping: number };
    shards: { id: number; status: string; ping: number; guilds: number; users: number }[];
    usage: { total: number; last24h: number; hourly: { hour: string; uses: number }[]; topCommands: { command: string; uses: number }[] };
    economy: { users: number; coinsInCirculation: number };
    leveling: { members: number; messagesCounted: number };
    system: { memoryMb: number; heapMb: number; cpuCount: number; loadAverage: number; platform: string; runtime: string; library: string };
}
