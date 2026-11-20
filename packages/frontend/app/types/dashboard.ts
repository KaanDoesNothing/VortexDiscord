// Shapes returned by the bot's API (packages/client/routes). Keep in sync with lib/settings.ts there.

// A message template: text plus an optional embed. Placeholders work in every text field.
export interface RichEmbed { enabled: boolean; title: string; description: string; color: string; image: string; thumbnail: string; footer: string }
export interface RichMessage { content: string; embed: RichEmbed }

export type RuleAction = "default" | "delete" | "warn" | "timeout" | "kick" | "ban";
export type AutomodRule = "words" | "invites" | "links" | "phishing" | "mentions" | "spam" | "duplicates" | "caps" | "emoji" | "repeatedChars" | "newlines" | "zalgo";

export interface GuildSettings {
    branding: { color: string; footer: string };
    commandChannels: { mode: "all" | "allow" | "deny"; channelIds: string[] };
    commandRules: Record<string, { roleIds: string[]; channelIds: string[]; cooldownSeconds: number }>;
    aliases: { alias: string; command: string }[];
    replies: { privateCategories: string[]; deleteInvocation: boolean };
    leveling: {
        enabled: boolean;
        xpMin: number;
        xpMax: number;
        difficulty: number;
        cooldownSeconds: number;
        ignoredChannelIds: string[];
        noXpRoleIds: string[];
        roleMultipliers: { roleId: string; percent: number }[];
        channelMultipliers: { channelId: string; percent: number }[];
        voice: { enabled: boolean; xpPerMinute: number; requireOthers: boolean; ignoreMuted: boolean };
        announce: boolean;
        announceChannelId: string | null;
        announceDm: boolean;
        message: RichMessage;
        rewards: { level: number; roleId: string }[];
        stackRewards: boolean;
        card: { accentColor: string; backgroundUrl: string };
        publicLeaderboard: boolean;
    };
    welcome: { enabled: boolean; channelId: string | null; message: RichMessage; image: boolean; dm: { enabled: boolean; message: RichMessage } };
    goodbye: { enabled: boolean; channelId: string | null; message: RichMessage };
    autoRoleIds: string[];
    modLog: { enabled: boolean; channelId: string | null };
    logs: { messages: string | null; members: string | null; roles: string | null; voice: string | null; server: string | null; moderation: string | null; invites: string | null };
    moderation: { dmOnAction: boolean; dmMessage: RichMessage; warnExpiryDays: number; requireReason: boolean };
    automod: {
        enabled: boolean;
        blockedWords: string[];
        blockInvites: boolean;
        blockLinks: boolean;
        allowedDomains: string[];
        blockPhishing: boolean;
        maxMentions: number;
        spam: { enabled: boolean; messages: number; seconds: number };
        duplicates: { enabled: boolean; count: number; seconds: number };
        caps: { enabled: boolean; percent: number; minLength: number };
        emoji: { enabled: boolean; max: number };
        repeatedChars: { enabled: boolean; max: number };
        newlines: { enabled: boolean; max: number };
        zalgo: boolean;
        action: "delete" | "warn" | "timeout" | "kick" | "ban";
        actions: Record<AutomodRule, RuleAction>;
        timeoutMinutes: number;
        exemptRoleIds: string[];
        exemptChannelIds: string[];
    };
    antiRaid: { enabled: boolean; joins: number; seconds: number; action: "lockdown" | "alert"; lockdownMinutes: number; minAccountAgeDays: number; alertChannelId: string | null };
    verification: { enabled: boolean; roleId: string | null; method: "button" | "captcha"; panelMessage: string };
    warnThresholds: { count: number; action: "timeout" | "kick" | "ban"; durationMinutes: number }[];
    appeals: { enabled: boolean; message: RichMessage };
    starboard: { enabled: boolean; channelId: string | null; emoji: string; threshold: number; allowSelfStar: boolean; ignoredChannelIds: string[]; allowNsfw: boolean };
    birthdays: { enabled: boolean; channelId: string | null; message: RichMessage };
    tickets: {
        enabled: boolean;
        categoryId: string | null;
        staffRoleIds: string[];
        openMessage: RichMessage;
        maxOpenPerUser: number;
        logChannelId: string | null;
        transcriptFormat: "html" | "text";
        pingStaff: boolean;
        types: { name: string; emoji: string; description: string; categoryId: string | null; staffRoleIds: string[]; questions: string[] }[];
    };
    suggestions: { enabled: boolean; channelId: string | null };
    economy: {
        currencyName: string;
        currencyEmoji: string;
        mode: "global" | "server";
        startingBalance: number;
        daily: { reward: number; streakBonus: number };
        weekly: { reward: number };
        work: { min: number; max: number; cooldownMinutes: number };
        beg: { min: number; max: number; chance: number; cooldownMinutes: number };
        crime: { min: number; max: number; chance: number; fineMin: number; fineMax: number; cooldownMinutes: number };
        rob: { enabled: boolean; chance: number; cooldownMinutes: number };
        gambling: { enabled: boolean; maxBet: number };
    };
    tempVoice: { enabled: boolean; hubChannelIds: string[]; categoryId: string | null; nameTemplate: string; userLimit: number };
    statsChannels: { channelId: string; template: string }[];
    music: {
        enabled: boolean;
        djRoleIds: string[];
        defaultVolume: number;
        maxVolume: number;
        maxQueuePerUser: number;
        maxQueueSize: number;
        announceNowPlaying: boolean;
        leaveAfterQueueEndSeconds: number;
        leaveWhenAloneSeconds: number;
        stay247: boolean;
        searchSource: "ytsearch" | "ytmsearch" | "scsearch" | "spsearch";
    };
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
    voiceChannels: ChannelOption[];
    roles: RoleOption[];
    config: GuildConfig;
    placeholders: Record<string, string>;
    features: { membersIntent: boolean; twitch: boolean; manageGuild: boolean };
    statPlaceholders: Record<string, string>;
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
export interface LeaderboardRow { rank: number; userId: string; level: number; xp: number; messages: number; voiceMinutes: number }
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
    style: "buttons" | "select";
    roles: { roleId: string; label: string; emoji?: string }[];
}

export interface GiveawayRow { id: number; prize: string; channelId: string; winnerCount: number; hostId: string; endsAt: string; ended: boolean; entries: number; winners: string[] }

export interface MessageDraft {
    channelId: string;
    content: string;
    embed: { title: string; description: string; color: string; image?: string; footer?: string } | null;
}

export interface Announcement extends MessageDraft { id: number; runAt: string; repeatMinutes: number | null; cron?: string | null; timezone?: string | null }

export interface ShopItem { id: number; name: string; description: string; emoji: string; price: number; roleId: string | null; stock: number | null; maxPerUser: number; requiredRoleId: string | null; enabled: boolean }
export interface Autoresponder { id: number; trigger: string; match: "contains" | "exact" | "startsWith" | "word"; response: string; embed: boolean; reaction: string; channelIds: string[]; cooldownSeconds: number; enabled: boolean; uses: number }
export interface Feed { id: number; type: "youtube" | "twitch" | "reddit" | "rss"; source: string; label: string; channelId: string; message: string; pingRoleId: string | null; failures: number; lastCheckedAt: string | null }
export interface GuildExtras {
    stickies: { channelId: string; content: string; embed: boolean }[];
    reactionRoles: { id: number; channelId: string; messageId: string; emoji: string; roleId: string }[];
    statPlaceholders: Record<string, string>;
}

export interface Ticket { id: number; channelId: string; ownerId: string; topic: string | null; closed: boolean; closedBy: string | null; createdAt: string; closedAt: string | null }
export interface Suggestion { id: number; authorId: string; content: string; status: "open" | "approved" | "denied" | "implemented"; response: string | null; createdAt: string }

export interface BotStats {
    bot: { id: string; username: string; avatar: string; uptimeMs: number; readyAt: string | null };
    totals: { guilds: number; users: number; channels: number; commands: number; shards: number; ping: number };
    shards: { id: number; status: string; ping: number; guilds: number; users: number }[];
    usage: { total: number; last24h: number; hourly: { hour: string; uses: number }[]; topCommands: { command: string; uses: number }[] };
    economy: { users: number; coinsInCirculation: number };
    music: MusicNodeStatus;
    leveling: { members: number; messagesCounted: number };
    system: { memoryMb: number; heapMb: number; cpuCount: number; loadAverage: number; platform: string; runtime: string; library: string };
}

export interface MusicNodeStatus {
    configured: boolean;
    players: number;
    playing: number;
    nodes: { id: string; type: string; connected: boolean; players: number; playingPlayers: number; uptimeMs: number; memoryMb: number; cpuLoad: number }[];
}

export interface MusicTrack {
    index?: number;
    title: string;
    author: string;
    uri: string | null;
    artworkUrl: string | null;
    durationMs: number;
    isStream: boolean;
    source: string;
    requester: { id: string; username: string; avatar: string } | null;
}

// GET /guilds/:guild/music
export type MusicState =
    | { configured: boolean; nodeOnline: boolean; active: false }
    | {
        configured: true;
        nodeOnline: boolean;
        active: true;
        voiceChannelId: string | null;
        voiceChannelName: string | null;
        paused: boolean;
        playing: boolean;
        volume: number;
        repeatMode: "off" | "track" | "queue";
        autoplay: boolean;
        positionMs: number;
        current: MusicTrack | null;
        queue: MusicTrack[];
        queueLength: number;
        queueDurationMs: number;
        previousCount: number;
    };
