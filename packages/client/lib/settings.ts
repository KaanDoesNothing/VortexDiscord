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
const err = (error: string) => ({ error });
const isError = (v: unknown): v is { error: string } => typeof v === "object" && v !== null && "error" in v && Object.keys(v).length === 1;

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
                // Keep the current value if it's still valid, else the default.
                const ok = cur !== undefined && !isError(def.parse(cur));
                out[key] = ok ? cur : structuredClone(def.default);
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

const SCHEMA = {
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

    leveling: {
        enabled: f.bool(true),
        messagesPerLevel: f.int(100, 1, 10_000),
        // Messages sent faster than this don't count.
        cooldownSeconds: f.int(0, 0, 3600),
        ignoredChannelIds: f.ids(),
        announce: f.bool(false),
        // null = the channel they leveled up in.
        announceChannelId: f.id(),
        message: f.text("GG {user.mention}, you reached level **{level}**!", MSG),
        // Roles handed out at certain levels.
        rewards: f.list({ level: f.int(1, 1, 10_000), roleId: f.requiredId() }, 25),
        // true: keep all earned reward roles. false: only keep the highest one.
        stackRewards: f.bool(true)
    },

    welcome: {
        enabled: f.bool(false),
        channelId: f.id(),
        message: f.text("Welcome to **{server}**, {user.mention}! You're member #{memberCount}.", MSG),
        // Attach a generated welcome card with their avatar.
        image: f.bool(false)
    },
    goodbye: {
        enabled: f.bool(false),
        channelId: f.id(),
        message: f.text("**{user.name}** left the server.", MSG)
    },
    autoRoleIds: f.ids(10),

    modLog: { enabled: f.bool(false), channelId: f.id() },

    // Event logs, each to its own channel (null = off).
    logs: {
        messages: f.id(),   // deleted and edited messages
        members: f.id(),    // joins and leaves
        roles: f.id(),      // role and nickname changes
        voice: f.id()       // joining, leaving and moving voice channels
    },

    automod: {
        enabled: f.bool(false),
        blockedWords: f.words(200, 50),
        blockInvites: f.bool(true),
        blockLinks: f.bool(false),
        // Links to these domains are fine even with blockLinks on.
        allowedDomains: f.words(50, 100),
        // 0 = off. Messages mentioning more users/roles than this are removed.
        maxMentions: f.int(5, 0, 50),
        // Same-user flood detection: more than `messages` within `seconds`.
        spam: { enabled: f.bool(true), messages: f.int(6, 2, 30), seconds: f.int(5, 1, 60) },
        // What happens to the author. The message is always deleted.
        action: f.oneOf("delete", ["delete", "warn", "timeout"] as const),
        timeoutMinutes: f.int(10, 1, 40_320),
        exemptRoleIds: f.ids(25),
        exemptChannelIds: f.ids(50)
    },

    // Automatic punishment once a member reaches a number of warnings.
    warnThresholds: f.list({
        count: f.int(3, 1, 100),
        action: f.oneOf("timeout", ["timeout", "kick", "ban"] as const),
        // For timeout (max 28 days); ignored otherwise.
        durationMinutes: f.int(60, 1, 40_320)
    }, 10),

    // DM sent to banned users (e.g. a link to an appeal form).
    appeals: { enabled: f.bool(false), message: f.text("You were banned from **{server}**. You can appeal here: <link>", MSG) },

    starboard: {
        enabled: f.bool(false),
        channelId: f.id(),
        emoji: f.text("⭐", 64),
        threshold: f.int(3, 1, 100),
        // Count the author's own reaction.
        allowSelfStar: f.bool(false)
    },

    birthdays: {
        enabled: f.bool(false),
        channelId: f.id(),
        message: f.text("🎂 Happy birthday {user.mention}!", MSG)
    },

    tickets: {
        enabled: f.bool(false),
        // Channel category new tickets are created in (null = top of the server).
        categoryId: f.id(),
        // Roles that can see and close every ticket.
        staffRoleIds: f.ids(10),
        openMessage: f.text("Thanks for reaching out, {user.mention}! Staff will be with you soon. Describe your issue below.", MSG),
        maxOpenPerUser: f.int(1, 1, 5),
        // A transcript is posted here when a ticket closes.
        logChannelId: f.id()
    },

    suggestions: { enabled: f.bool(false), channelId: f.id() },

    economy: {
        // Display name only; balances are shared across servers.
        currencyName: f.text("Coins", 24),
        currencyEmoji: f.text("🪙", 64, true)
    },

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

// Stored JSON → full settings. Never throws: invalid or missing values fall back to defaults.
export const readSettings = (stored: unknown) => resolveShape(SCHEMA, stored, DEFAULT_SETTINGS).value;

// ---------- Message templates ----------

// Placeholders usable in messages, shown in the dashboard.
export const PLACEHOLDERS = {
    "{user}": "Username",
    "{user.name}": "Display name",
    "{user.mention}": "Mentions the user",
    "{user.id}": "User ID",
    "{server}": "Server name",
    "{memberCount}": "Member count",
    "{channel}": "Mentions the current channel",
    "{level}": "New level (leveling only)",
    "{args}": "Text after the command (custom commands only)"
} as const;

export interface TemplateContext {
    user?: { id: string; username: string; displayName?: string | null };
    server?: { name: string; memberCount: number };
    channelId?: string;
    level?: number;
    args?: string;
}

// Fills in {placeholders}. Unknown placeholders are left as-is.
export function renderTemplate(template: string, ctx: TemplateContext) {
    const values: Record<string, string | undefined> = {
        "{user}": ctx.user?.username,
        "{user.name}": ctx.user ? ctx.user.displayName ?? ctx.user.username : undefined,
        "{user.mention}": ctx.user ? `<@${ctx.user.id}>` : undefined,
        "{user.id}": ctx.user?.id,
        "{server}": ctx.server?.name,
        "{memberCount}": ctx.server?.memberCount.toLocaleString(),
        "{channel}": ctx.channelId ? `<#${ctx.channelId}>` : undefined,
        "{level}": ctx.level?.toString(),
        "{args}": ctx.args ?? ""
    };

    return template.replace(/\{[\w.]+\}/g, (match) => values[match] ?? match);
}
