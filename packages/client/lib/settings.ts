// Per-server settings edited from the dashboard (and partly via /settings).
//
// Stored as one JSON object in guilds.settings. Everything is declared once in SCHEMA below:
// the type, limits and default of each field. From that we get the TypeScript type, the
// defaults, and validation of dashboard input. To add an option, add one line to SCHEMA;
// no database migration is needed because missing fields fall back to their defaults.

// ---------- Tiny schema DSL ----------

type Field<T> = {
    default: T;
    // Returns the cleaned value, or a string error message.
    parse(value: unknown): T | { error: string };
};

const SNOWFLAKE = /^\d{15,25}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const URL_RE = /^https:\/\/\S+$/;
const SLUG = /^[\w-]{1,32}$/;
const err = (error: string) => ({ error });
const isError = (v: unknown): v is { error: string } => typeof v === "object" && v !== null && "error" in v && Object.keys(v).length === 1;

// ---------- Rich messages (text + optional embed) ----------

export interface RichEmbed {
    enabled: boolean;
    title: string;
    description: string;
    // "" = the server's brand color.
    color: string;
    image: string;
    thumbnail: string;
    footer: string;
}
export interface RichMessage { content: string; embed: RichEmbed }

const EMPTY_EMBED: RichEmbed = { enabled: false, title: "", description: "", color: "", image: "", thumbnail: "", footer: "" };
const MESSAGE_MAX = 2000;

function parseRichMessage(v: unknown): RichMessage | { error: string } {
    if (typeof v === "string") v = { content: v };
    if (typeof v !== "object" || v === null || Array.isArray(v)) return err("must be a message");
    const o = v as Record<string, unknown>;
    const e = (typeof o.embed === "object" && o.embed !== null ? o.embed : {}) as Record<string, unknown>;
    const str = (x: unknown) => (typeof x === "string" ? x : "");

    const content = str(o.content);
    const embed: RichEmbed = {
        enabled: e.enabled === true,
        title: str(e.title),
        description: str(e.description),
        color: str(e.color),
        image: str(e.image),
        thumbnail: str(e.thumbnail),
        footer: str(e.footer)
    };

    if (content.length > MESSAGE_MAX) return err(`text can be at most ${MESSAGE_MAX} characters`);
    if (embed.title.length > 256) return err("embed title can be at most 256 characters");
    if (embed.description.length > 4000) return err("embed description can be at most 4000 characters");
    if (embed.footer.length > 2048) return err("embed footer can be at most 2048 characters");
    if (embed.color && !HEX.test(embed.color)) return err("embed color must look like #6d6af0");
    // Images may be a placeholder like {user.avatar}, or a real https link.
    for (const key of ["image", "thumbnail"] as const) {
        if (embed[key] && !URL_RE.test(embed[key]) && !/^\{[\w.]+\}$/.test(embed[key])) return err(`embed ${key} must be an https:// link or a placeholder`);
    }
    const hasEmbed = embed.enabled && Boolean(embed.title || embed.description || embed.image);
    if (!content.trim() && !hasEmbed) return err("needs text or an embed");
    return { content, embed };
}

const f = {
    bool: (def: boolean): Field<boolean> => ({
        default: def,
        parse: (v) => (typeof v === "boolean" ? v : err("must be true or false"))
    }),
    int: (def: number, min: number, max: number): Field<number> => ({
        default: def,
        parse: (v) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : err(`must be a whole number from ${min} to ${max}`))
    }),
    // A channel/role ID, or null for "none".
    id: (): Field<string | null> => ({
        default: null,
        parse: (v) => (v === null || v === "" ? null : typeof v === "string" && SNOWFLAKE.test(v) ? v : err("must be a channel or role ID"))
    }),
    // A required channel/role ID.
    requiredId: (): Field<string> => ({
        default: "",
        parse: (v) => (typeof v === "string" && SNOWFLAKE.test(v) ? v : err("must be a channel or role ID"))
    }),
    ids: (max = 50): Field<string[]> => ({
        default: [],
        parse: (v) => {
            if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && SNOWFLAKE.test(x))) return err("must be a list of IDs");
            if (v.length > max) return err(`can have at most ${max} entries`);
            return [...new Set(v as string[])];
        }
    }),
    text: (def: string, max: number, allowEmpty = false): Field<string> => ({
        default: def,
        parse: (v) => (typeof v === "string" && (allowEmpty || v.trim()) && v.length <= max ? v : err(`must be ${allowEmpty ? "0" : "1"} to ${max} characters`))
    }),
    // "#rrggbb", or "" (when allowEmpty) for "use the default".
    color: (def: string, allowEmpty = false): Field<string> => ({
        default: def,
        parse: (v) => (typeof v === "string" && (HEX.test(v) || (allowEmpty && v === "")) ? v.toLowerCase() : err("must be a color like #6d6af0"))
    }),
    // An https:// link, or "" for none.
    url: (): Field<string> => ({
        default: "",
        parse: (v) => (v === "" || v === null ? "" : typeof v === "string" && v.length <= 1000 && URL_RE.test(v) ? v : err("must be a link starting with https://"))
    }),
    // A list of free-text lines (case kept, unlike words()).
    strings: (max: number, maxLength: number): Field<string[]> => ({
        default: [],
        parse: (v) => {
            if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) return err("must be a list of text");
            const cleaned = (v as string[]).map((s) => s.trim()).filter(Boolean);
            if (cleaned.length > max) return err(`can have at most ${max} entries`);
            if (cleaned.some((s) => s.length > maxLength)) return err(`entries can be at most ${maxLength} characters`);
            return cleaned;
        }
    }),
    // A command-like name: lowercase letters, numbers, - and _.
    slug: (): Field<string> => ({
        default: "",
        parse: (v) => (typeof v === "string" && SLUG.test(v.trim().toLowerCase()) ? v.trim().toLowerCase() : err("must be 1-32 lowercase letters, numbers, - or _"))
    }),
    // A message template: text plus an optional embed. Older settings stored a plain string,
    // which is still accepted and becomes { content: <string> }.
    message: (content: string): Field<RichMessage> => ({
        default: { content, embed: { ...EMPTY_EMBED } },
        parse: (v) => parseRichMessage(v)
    }),
    words: (max: number, maxLength: number): Field<string[]> => ({
        default: [],
        parse: (v) => {
            if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) return err("must be a list of words");
            const cleaned = [...new Set((v as string[]).map((w) => w.trim().toLowerCase()).filter(Boolean))];
            if (cleaned.length > max) return err(`can have at most ${max} entries`);
            if (cleaned.some((w) => w.length > maxLength)) return err(`entries can be at most ${maxLength} characters`);
            return cleaned;
        }
    }),
    oneOf: <const T extends string>(def: T, options: readonly T[]): Field<T> => ({
        default: def,
        parse: (v) => (options.includes(v as T) ? (v as T) : err(`must be one of ${options.join(", ")}`))
    }),
    // A list of objects, each validated by the given shape.
    list: <S extends Shape>(shape: S, max: number): Field<Resolved<S>[]> => ({
        default: [],
        parse: (v) => {
            if (!Array.isArray(v)) return err("must be a list");
            if (v.length > max) return err(`can have at most ${max} entries`);
            const out: Resolved<S>[] = [];
            for (const [i, item] of v.entries()) {
                const r = resolveShape(shape, item, defaultsOf(shape), `#${i + 1}`);
                if (r.errors.length) return err(r.errors.join("; "));
                out.push(r.value);
            }
            return out;
        }
    }),
    // A map of name → object (e.g. per-command rules).
    record: <S extends Shape>(shape: S, max: number, key: RegExp): Field<Record<string, Resolved<S>>> => ({
        default: {},
        parse: (v) => {
            if (typeof v !== "object" || v === null || Array.isArray(v)) return err("must be an object");
            const entries = Object.entries(v);
            if (entries.length > max) return err(`can have at most ${max} entries`);
            const out: Record<string, Resolved<S>> = {};
            for (const [k, item] of entries) {
                if (!key.test(k)) return err(`"${k}" is not a valid key`);
                const r = resolveShape(shape, item, defaultsOf(shape), k);
                if (r.errors.length) return err(r.errors.join("; "));
                out[k] = r.value;
            }
            return out;
        }
    })
};

type Shape = { [key: string]: Field<any> | Shape };
type Resolved<S> = { [K in keyof S]: S[K] extends Field<infer T> ? T : S[K] extends Shape ? Resolved<S[K]> : never };

const isField = (x: Field<any> | Shape): x is Field<any> => typeof (x as Field<any>).parse === "function";

function defaultsOf<S extends Shape>(shape: S): Resolved<S> {
    const out: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(shape)) {
        out[key] = isField(def) ? structuredClone(def.default) : defaultsOf(def);
    }
    return out as Resolved<S>;
}

// Merges untrusted `input` over `current`, validating each provided field. Unknown keys are ignored.
function resolveShape<S extends Shape>(shape: S, input: unknown, current: Resolved<S>, path = ""): { value: Resolved<S>; errors: string[] } {
    const errors: string[] = [];
    const src = typeof input === "object" && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : {};
    const out: Record<string, unknown> = {};

    for (const [key, def] of Object.entries(shape)) {
        const name = path ? `${path}.${key}` : key;
        const cur = (current as Record<string, unknown>)?.[key];

        if (isField(def)) {
            if (src[key] === undefined) {
                // Keep the current value if it's still valid (normalized, so older stored formats
                // are upgraded), else the default.
                const parsed = cur === undefined ? undefined : def.parse(cur);
                out[key] = parsed === undefined || isError(parsed) ? structuredClone(def.default) : parsed;
                continue;
            }
            const parsed = def.parse(src[key]);
            if (isError(parsed)) {
                errors.push(`${name} ${parsed.error}`);
                out[key] = cur ?? structuredClone(def.default);
            } else out[key] = parsed;
        } else {
            const nested = resolveShape(def, src[key], (cur ?? defaultsOf(def)) as Resolved<typeof def>, name);
            errors.push(...nested.errors);
            out[key] = nested.value;
        }
    }

    return { value: out as Resolved<S>, errors };
}

// ---------- The settings ----------

const MSG = 1500;

// What an automod rule does when it's broken. "default" uses automod.action.
const RULE_ACTIONS = ["default", "delete", "warn", "timeout", "kick", "ban"] as const;
const ruleAction = () => f.oneOf("default", RULE_ACTIONS);

// A min/max payout range for economy commands.
const payRange = (min: number, max: number) => ({ min: f.int(min, 0, 1_000_000_000), max: f.int(max, 0, 1_000_000_000) });

const SCHEMA = {
    // Embed color and footer used by every bot reply on this server.
    branding: {
        // "" = Vortex purple.
        color: f.color("", true),
        footer: f.text("", 200, true)
    },

    // Where commands may be used.
    commandChannels: {
        // all: everywhere. allow: only in channelIds. deny: everywhere except channelIds.
        mode: f.oneOf("all", ["all", "allow", "deny"] as const),
        channelIds: f.ids()
    },
    // Per-command overrides, keyed by command name.
    commandRules: f.record({
        // Only members with one of these roles can use it (empty = everyone).
        roleIds: f.ids(25),
        // Only usable in these channels (empty = anywhere allowed by commandChannels).
        channelIds: f.ids(25),
        // Seconds a user must wait between uses (0 = no cooldown).
        cooldownSeconds: f.int(0, 0, 86_400)
    }, 200, /^[\w-]{1,32}$/),
    // Extra names for prefix commands, e.g. { alias: "b", command: "ban" } makes "->b @user" work.
    aliases: f.list({ alias: f.slug(), command: f.slug() }, 50),
    replies: {
        // Command categories (folder names, e.g. "economy") whose slash replies only the user sees.
        privateCategories: f.words(20, 32),
        // Delete the member's message after a prefix command runs.
        deleteInvocation: f.bool(false)
    },

    leveling: {
        enabled: f.bool(true),
        // Random XP per counted message.
        xpMin: f.int(15, 0, 1000),
        xpMax: f.int(25, 0, 1000),
        // Percent: 200 = levels need twice the XP, 50 = half.
        difficulty: f.int(100, 25, 400),
        // Messages sent faster than this don't count.
        cooldownSeconds: f.int(60, 0, 3600),
        ignoredChannelIds: f.ids(),
        // Members with any of these roles never earn XP.
        noXpRoleIds: f.ids(25),
        // XP multipliers in percent (150 = 1.5x). The highest matching role/channel applies.
        roleMultipliers: f.list({ roleId: f.requiredId(), percent: f.int(150, 0, 1000) }, 25),
        channelMultipliers: f.list({ channelId: f.requiredId(), percent: f.int(150, 0, 1000) }, 50),
        // XP for time spent in voice channels.
        voice: {
            enabled: f.bool(false),
            xpPerMinute: f.int(10, 1, 500),
            // Only count when at least one other (non-bot) person is in the channel.
            requireOthers: f.bool(true),
            // Muted/deafened members don't earn voice XP.
            ignoreMuted: f.bool(true)
        },
        announce: f.bool(false),
        // null = the channel they leveled up in.
        announceChannelId: f.id(),
        // Send the level-up message as a DM instead.
        announceDm: f.bool(false),
        message: f.message("GG {user.mention}, you reached level **{level}**!"),
        // Roles handed out at certain levels.
        rewards: f.list({ level: f.int(1, 1, 10_000), roleId: f.requiredId() }, 25),
        // true: keep all earned reward roles. false: only keep the highest one.
        stackRewards: f.bool(true),
        // Look of the /rank card.
        card: { accentColor: f.color("#7c7af5"), backgroundUrl: f.url() },
        // Show this server's leaderboard on a public web page anyone can open.
        publicLeaderboard: f.bool(false)
    },

    welcome: {
        enabled: f.bool(false),
        channelId: f.id(),
        message: f.message("Welcome to **{server}**, {user.mention}! You're member #{memberCount}."),
        // Attach a generated welcome card with their avatar.
        image: f.bool(false),
        // Also DM the new member.
        dm: { enabled: f.bool(false), message: f.message("Welcome to **{server}**! Read the rules and have fun.") }
    },
    goodbye: {
        enabled: f.bool(false),
        channelId: f.id(),
        message: f.message("**{user.name}** left the server.")
    },
    autoRoleIds: f.ids(10),

    modLog: { enabled: f.bool(false), channelId: f.id() },

    // Event logs, each to its own channel (null = off).
    logs: {
        messages: f.id(),    // deleted and edited messages
        members: f.id(),     // joins and leaves
        roles: f.id(),       // member role and nickname changes
        voice: f.id(),       // joining, leaving and moving voice channels
        server: f.id(),      // channels, roles, emojis and server settings changing
        moderation: f.id(),  // bans and unbans (also ones done without the bot)
        invites: f.id()      // invites created/deleted, and who invited each new member
    },

    moderation: {
        // DM members when they're warned, timed out, kicked or banned.
        dmOnAction: f.bool(true),
        dmMessage: f.message("You received a **{action}** in **{server}**.\nReason: {reason}"),
        // Warnings older than this stop counting toward thresholds (0 = never expire).
        warnExpiryDays: f.int(0, 0, 3650),
        // Moderation commands must be given a reason.
        requireReason: f.bool(false)
    },

    automod: {
        enabled: f.bool(false),
        blockedWords: f.words(200, 50),
        blockInvites: f.bool(true),
        blockLinks: f.bool(false),
        // Links to these domains are fine even with blockLinks on.
        allowedDomains: f.words(50, 100),
        // Known phishing / fake-Nitro links.
        blockPhishing: f.bool(true),
        // 0 = off. Messages mentioning more users/roles than this are removed.
        maxMentions: f.int(5, 0, 50),
        // Same-user flood detection: more than `messages` within `seconds`.
        spam: { enabled: f.bool(true), messages: f.int(6, 2, 30), seconds: f.int(5, 1, 60) },
        // The same message sent `count` times within `seconds`.
        duplicates: { enabled: f.bool(false), count: f.int(3, 2, 20), seconds: f.int(30, 5, 600) },
        // Mostly-uppercase messages (only checked from minLength letters).
        caps: { enabled: f.bool(false), percent: f.int(70, 50, 100), minLength: f.int(10, 3, 200) },
        // More than `max` emojis in one message.
        emoji: { enabled: f.bool(false), max: f.int(10, 1, 100) },
        // The same character repeated more than `max` times in a row ("heeeeeeeey").
        repeatedChars: { enabled: f.bool(false), max: f.int(10, 3, 100) },
        // More than `max` line breaks.
        newlines: { enabled: f.bool(false), max: f.int(15, 2, 100) },
        // Zalgo / glitch text made of stacked combining characters.
        zalgo: f.bool(false),
        // What happens to the author. The message is always deleted.
        action: f.oneOf("delete", ["delete", "warn", "timeout", "kick", "ban"] as const),
        // Per-rule overrides of `action`.
        actions: {
            words: ruleAction(), invites: ruleAction(), links: ruleAction(), phishing: ruleAction(),
            mentions: ruleAction(), spam: ruleAction(), duplicates: ruleAction(), caps: ruleAction(),
            emoji: ruleAction(), repeatedChars: ruleAction(), newlines: ruleAction(), zalgo: ruleAction()
        },
        timeoutMinutes: f.int(10, 1, 40_320),
        exemptRoleIds: f.ids(25),
        exemptChannelIds: f.ids(50)
    },

    // Raid protection (needs the Server Members intent).
    antiRaid: {
        enabled: f.bool(false),
        // More than `joins` new members within `seconds` counts as a raid.
        joins: f.int(10, 3, 100),
        seconds: f.int(10, 3, 300),
        // lockdown: raise the verification level and kick new joiners until it ends. alert: only notify.
        action: f.oneOf("lockdown", ["lockdown", "alert"] as const),
        lockdownMinutes: f.int(15, 1, 1440),
        // Kick accounts younger than this many days (0 = off).
        minAccountAgeDays: f.int(0, 0, 365),
        // Raid alerts go here (falls back to the mod log channel).
        alertChannelId: f.id()
    },

    // New members must click a button (or solve a captcha) to get the verified role.
    verification: {
        enabled: f.bool(false),
        roleId: f.id(),
        method: f.oneOf("button", ["button", "captcha"] as const),
        panelMessage: f.text("Welcome! Click **Verify** below to get access to the rest of the server.", MSG)
    },

    // Automatic punishment once a member reaches a number of warnings.
    warnThresholds: f.list({
        count: f.int(3, 1, 100),
        action: f.oneOf("timeout", ["timeout", "kick", "ban"] as const),
        // For timeout (max 28 days); ignored otherwise.
        durationMinutes: f.int(60, 1, 40_320)
    }, 10),

    // DM sent to banned users (e.g. a link to an appeal form).
    appeals: { enabled: f.bool(false), message: f.message("You were banned from **{server}**. You can appeal here: <link>") },

    starboard: {
        enabled: f.bool(false),
        channelId: f.id(),
        emoji: f.text("⭐", 64),
        threshold: f.int(3, 1, 100),
        // Count the author's own reaction.
        allowSelfStar: f.bool(false),
        // Messages from these channels never go on the starboard.
        ignoredChannelIds: f.ids(),
        // Allow messages from age-restricted channels.
        allowNsfw: f.bool(false)
    },

    birthdays: {
        enabled: f.bool(false),
        channelId: f.id(),
        message: f.message("🎂 Happy birthday {user.mention}!")
    },

    tickets: {
        enabled: f.bool(false),
        // Channel category new tickets are created in (null = top of the server).
        categoryId: f.id(),
        // Roles that can see and close every ticket.
        staffRoleIds: f.ids(10),
        openMessage: f.message("Thanks for reaching out, {user.mention}! Staff will be with you soon. Describe your issue below."),
        maxOpenPerUser: f.int(1, 1, 5),
        // A transcript is posted here when a ticket closes.
        logChannelId: f.id(),
        transcriptFormat: f.oneOf("html", ["html", "text"] as const),
        // Ping the staff roles when a ticket opens.
        pingStaff: f.bool(true),
        // Ticket types shown in the panel's menu. Empty = a single "Open a ticket" button.
        types: f.list({
            name: f.text("Support", 50),
            emoji: f.text("", 64, true),
            description: f.text("", 100, true),
            // Overrides the category and staff roles above for this type.
            categoryId: f.id(),
            staffRoleIds: f.ids(10),
            // Up to 5 questions asked in a form before the ticket opens.
            questions: f.strings(5, 45)
        }, 10)
    },

    suggestions: { enabled: f.bool(false), channelId: f.id() },

    economy: {
        currencyName: f.text("Coins", 24),
        currencyEmoji: f.text("🪙", 64, true),
        // global: balances shared with every server. server: this server has its own balances,
        // and the payouts below apply (global mode always uses the defaults, so no server can inflate it).
        mode: f.oneOf("global", ["global", "server"] as const),
        startingBalance: f.int(500, 0, 1_000_000_000),
        daily: { reward: f.int(500, 0, 1_000_000_000), streakBonus: f.int(50, 0, 1_000_000) },
        weekly: { reward: f.int(3000, 0, 1_000_000_000) },
        work: { ...payRange(120, 400), cooldownMinutes: f.int(60, 1, 10_080) },
        beg: { ...payRange(5, 60), chance: f.int(60, 0, 100), cooldownMinutes: f.int(5, 1, 10_080) },
        crime: { ...payRange(300, 1200), chance: f.int(45, 0, 100), fineMin: f.int(200, 0, 1_000_000_000), fineMax: f.int(800, 0, 1_000_000_000), cooldownMinutes: f.int(120, 1, 10_080) },
        rob: { enabled: f.bool(true), chance: f.int(40, 0, 100), cooldownMinutes: f.int(180, 1, 10_080) },
        gambling: { enabled: f.bool(true), maxBet: f.int(1_000_000, 1, 1_000_000_000) }
    },

    // "Join to create" voice channels.
    tempVoice: {
        enabled: f.bool(false),
        // Joining one of these creates a new channel for the member.
        hubChannelIds: f.ids(5),
        // Where new channels go (null = the hub's category).
        categoryId: f.id(),
        nameTemplate: f.text("{user.name}'s channel", 100),
        userLimit: f.int(0, 0, 99)
    },

    // Channels renamed every 10 minutes to show live server stats.
    statsChannels: f.list({ channelId: f.requiredId(), template: f.text("Members: {memberCount}", 100) }, 10),

    // Music (needs a NodeLink/Lavalink node configured in .env).
    music: {
        enabled: f.bool(true),
        // Members with one of these roles (or Manage Server) can control anyone's music.
        // Without DJ roles, everyone can. Someone alone with the bot can always control it.
        djRoleIds: f.ids(10),
        defaultVolume: f.int(80, 1, 150),
        maxVolume: f.int(150, 10, 200),
        // Most tracks one person can have queued at once (0 = no limit).
        maxQueuePerUser: f.int(0, 0, 1000),
        maxQueueSize: f.int(500, 1, 2000),
        // Post a "Now playing" card with buttons when a song starts.
        announceNowPlaying: f.bool(true),
        // Seconds to stay after the queue ends / everyone leaves (0 = leave right away).
        leaveAfterQueueEndSeconds: f.int(120, 0, 3600),
        leaveWhenAloneSeconds: f.int(60, 0, 3600),
        // Stay in voice even when idle (DJs toggle with /247).
        stay247: f.bool(false),
        // Where plain searches go: YouTube, YouTube Music, SoundCloud, Spotify (needs NodeLink Spotify config).
        searchSource: f.oneOf("ytsearch", ["ytsearch", "ytmsearch", "scsearch", "spsearch"] as const)
    }
} satisfies Shape;

export type GuildSettings = Resolved<typeof SCHEMA>;
export const DEFAULT_SETTINGS: GuildSettings = defaultsOf(SCHEMA);

// Merges a partial, untrusted input over the current settings and validates every provided field.
export function resolveSettings(input: unknown, current: GuildSettings = DEFAULT_SETTINGS): { settings: GuildSettings; errors: string[] } {
    const { value, errors } = resolveShape(SCHEMA, input, current);
    return { settings: value, errors };
}

// For settings copied from another server: channel/role IDs that don't exist here are removed
// (single IDs become null, lists drop them, list entries that need one are dropped).
export function dropForeignIds(settings: GuildSettings, guild: { channels: { cache: { has(id: string): boolean } }; roles: { cache: { has(id: string): boolean } } }): GuildSettings {
    const exists = (id: string) => guild.channels.cache.has(id) || guild.roles.cache.has(id);
    const walk = (value: unknown): unknown => {
        if (typeof value === "string") return SNOWFLAKE.test(value) && !exists(value) ? null : value;
        if (Array.isArray(value)) {
            return value
                .filter((v) => !(typeof v === "string" && SNOWFLAKE.test(v) && !exists(v)))
                // An entry that pointed at a missing channel/role (e.g. a level reward for a role that
                // isn't here) is dropped. Entries with IDs that were already empty are kept.
                .filter((v) => !(v && typeof v === "object" && !Array.isArray(v) && Object.values(v).some((x) => typeof x === "string" && SNOWFLAKE.test(x) && !exists(x))))
                .map(walk);
        }
        if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
        return value;
    };
    // Re-validate so the result is a clean, complete settings object.
    return resolveShape(SCHEMA, walk(settings), DEFAULT_SETTINGS).value;
}

// Stored JSON → full settings. Never throws: invalid or missing values fall back to defaults.
export const readSettings = (stored: unknown) => resolveShape(SCHEMA, stored, DEFAULT_SETTINGS).value;

// ---------- Message templates ----------

// Placeholders usable in messages, shown in the dashboard.
export const PLACEHOLDERS = {
    "{user}": "Username",
    "{user.name}": "Display name",
    "{user.mention}": "Mentions the user",
    "{user.id}": "User ID",
    "{user.avatar}": "Link to their avatar (works as an embed image)",
    "{user.createdAt}": "When their account was made",
    "{user.joinedAt}": "When they joined this server",
    "{server}": "Server name",
    "{server.id}": "Server ID",
    "{server.icon}": "Link to the server icon (works as an embed image)",
    "{server.boosts}": "Number of boosts",
    "{memberCount}": "Member count",
    "{channel}": "Mentions the current channel",
    "{date}": "Today's date",
    "{level}": "New level (leveling only)",
    "{xp}": "Total XP (leveling only)",
    "{inviter}": "Who invited them (welcome only, needs invite tracking)",
    "{inviter.invites}": "How many people the inviter has brought (welcome only)",
    "{action}": "Punishment name (moderation DMs only)",
    "{reason}": "Reason given (moderation DMs only)",
    "{duration}": "Length of a timeout/temp ban (moderation DMs only)",
    "{args}": "Text after the command (custom commands only)",
    "{random:a|b|c}": "Picks one of the options at random"
} as const;

export interface TemplateContext {
    user?: { id: string; username: string; displayName?: string | null; avatarUrl?: string; createdAt?: Date; joinedAt?: Date | null };
    server?: { id?: string; name: string; memberCount: number; iconUrl?: string | null; boosts?: number };
    channelId?: string;
    level?: number;
    xp?: number;
    args?: string;
    inviter?: { id: string; invites: number } | null;
    // Feature-specific values, e.g. { action: "Ban", reason: "spam" } → {action}, {reason}.
    extra?: Record<string, string>;
}

// Discord's own relative timestamp ("3 days ago"), rendered in each reader's language.
const stamp = (date: Date | null | undefined) => (date ? `<t:${Math.floor(date.getTime() / 1000)}:R>` : undefined);

// Fills in {placeholders}. Unknown placeholders are left as-is.
export function renderTemplate(template: string, ctx: TemplateContext) {
    const values: Record<string, string | undefined> = {
        "{user}": ctx.user?.username,
        "{user.name}": ctx.user ? ctx.user.displayName ?? ctx.user.username : undefined,
        "{user.mention}": ctx.user ? `<@${ctx.user.id}>` : undefined,
        "{user.id}": ctx.user?.id,
        "{user.avatar}": ctx.user?.avatarUrl,
        "{user.createdAt}": stamp(ctx.user?.createdAt),
        "{user.joinedAt}": stamp(ctx.user?.joinedAt),
        "{server}": ctx.server?.name,
        "{server.id}": ctx.server?.id,
        "{server.icon}": ctx.server?.iconUrl ?? undefined,
        "{server.boosts}": ctx.server?.boosts?.toString(),
        "{memberCount}": ctx.server?.memberCount.toLocaleString("en-US"),
        "{channel}": ctx.channelId ? `<#${ctx.channelId}>` : undefined,
        "{date}": `<t:${Math.floor(Date.now() / 1000)}:D>`,
        "{level}": ctx.level?.toString(),
        "{xp}": ctx.xp?.toLocaleString("en-US"),
        "{inviter}": ctx.inviter === undefined ? undefined : ctx.inviter ? `<@${ctx.inviter.id}>` : "someone",
        "{inviter.invites}": ctx.inviter?.invites.toString() ?? (ctx.inviter === null ? "0" : undefined),
        "{args}": ctx.args ?? ""
    };
    for (const [key, value] of Object.entries(ctx.extra ?? {})) values[`{${key}}`] = value;

    return template
        // {random:a|b|c} picks one option.
        .replace(/\{random:([^{}]+)\}/g, (_, options: string) => {
            const list = options.split("|");
            return list[Math.floor(Math.random() * list.length)] ?? "";
        })
        .replace(/\{[\w.]+\}/g, (match) => values[match] ?? match);
}
