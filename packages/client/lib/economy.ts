import { DBManager, Economy as Db } from "./database";
import { DEFAULT_SETTINGS, type GuildSettings } from "./settings";

// The economy, as seen from one server.
//
// Servers choose (Dashboard → Economy) between the shared global economy and their own. In global
// mode everyone uses the "global" wallets and the default payouts, so no server can print money
// for everyone else. In server mode wallets are scoped to the guild and the server's tuned payouts
// apply. Commands get an Econ from economyFor(ctx.guildId) and never touch wallets directly.

export type EconomyConfig = GuildSettings["economy"];

// Defaults: what global mode always uses.
const DEFAULTS = DEFAULT_SETTINGS.economy;

export interface Econ {
    // "global" or the guild ID.
    scope: string;
    mode: "global" | "server";
    // Payouts and limits in effect here.
    config: EconomyConfig;
    name: string;
    emoji: string;
    // "🪙 **1,250** Coins"
    format(amount: number): string;

    wallet(userId: string): ReturnType<typeof Db.getWallet>;
    // Adds delta (negative to take) only if they hold at least requireAtLeast. New balance, or null.
    adjust(userId: string, delta: number, requireAtLeast?: number): Promise<number | null>;
    transfer(fromId: string, toId: string, amount: number): Promise<boolean>;
    claimDaily(userId: string): ReturnType<typeof Db.claimDaily>;
    claimCooldown(userId: string, key: string, cooldownMs: number): ReturnType<typeof Db.claimCooldown>;
    releaseCooldown(userId: string, key: string): Promise<void>;
    moveToBank(userId: string, amount: number): ReturnType<typeof Db.moveToBank>;
    steal(robberId: string, victimId: string, amount: number): Promise<boolean>;
    fine(userId: string, amount: number): Promise<number>;
    leaderboard(limit?: number): ReturnType<typeof Db.leaderboard>;
    // Returns an error message if this bet isn't allowed here, else null.
    checkBet(amount: number): string | null;
}

export async function economyFor(guildId: string | null): Promise<Econ> {
    const settings = guildId ? (await DBManager.getGuildConfig(guildId)).settings.economy : DEFAULTS;
    const mode = guildId && settings.mode === "server" ? "server" : "global";
    const scope = mode === "server" ? guildId! : "global";
    // Global mode keeps the display name/emoji and on/off switches but not the payout numbers.
    const config: EconomyConfig = mode === "server"
        ? settings
        : { ...DEFAULTS, currencyName: settings.currencyName, currencyEmoji: settings.currencyEmoji, mode: "global", rob: { ...DEFAULTS.rob, enabled: settings.rob.enabled }, gambling: { ...DEFAULTS.gambling, enabled: settings.gambling.enabled } };
    const start = config.startingBalance;
    const { currencyName: name, currencyEmoji: emoji } = config;

    return {
        scope,
        mode,
        config,
        name,
        emoji,
        format: (amount) => `${emoji ? `${emoji} ` : ""}**${Math.trunc(amount).toLocaleString("en-US")}** ${name}`,
        wallet: (userId) => Db.getWallet(scope, userId, start),
        adjust: (userId, delta, requireAtLeast = 0) => Db.adjustBalance(scope, userId, delta, requireAtLeast, start),
        transfer: (fromId, toId, amount) => Db.transfer(scope, fromId, toId, amount, start),
        claimDaily: (userId) => Db.claimDaily(scope, userId, config.daily.reward, 86_400_000, config.daily.streakBonus, start),
        claimCooldown: (userId, key, cooldownMs) => Db.claimCooldown(scope, userId, key, cooldownMs, start),
        releaseCooldown: (userId, key) => Db.releaseCooldown(scope, userId, key),
        moveToBank: (userId, amount) => Db.moveToBank(scope, userId, amount, start),
        steal: (robberId, victimId, amount) => Db.steal(scope, robberId, victimId, amount, start),
        fine: (userId, amount) => Db.fine(scope, userId, amount, start),
        leaderboard: (limit = 10) => Db.leaderboard(scope, limit),
        checkBet: (amount) => {
            if (!config.gambling.enabled) return "Gambling is turned off on this server.";
            if (amount > config.gambling.maxBet) return `The most you can bet here is ${config.gambling.maxBet.toLocaleString("en-US")}.`;
            return null;
        }
    };
}

// Kept for code that only needs the display format (e.g. trivia rewards text).
export const getCurrency = economyFor;

// Parses "500", "all" or "half" against an available amount. Returns null if invalid.
export function parseAmount(input: string, available: number): number | null {
    const value = input.trim().toLowerCase();
    if (value === "all" || value === "max") return available;
    if (value === "half") return Math.floor(available / 2);
    const n = Number(value.replace(/[,_]/g, ""));
    return Number.isInteger(n) && n > 0 ? n : null;
}

// Random whole number in [min, max] (order doesn't matter).
export const randomInt = (a: number, b: number) => {
    const [min, max] = a <= b ? [a, b] : [b, a];
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Random item from a list.
export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

// Fixed rules that aren't per-server settings.
export const ECONOMY = {
    weeklyCooldownMs: 7 * 86_400_000,
    // Robber takes 10-35% of the victim's wallet on success; victims need at least this much.
    rob: { minVictimWallet: 200, shareMin: 0.1, shareMax: 0.35, fineMin: 150, fineMax: 600 },
    // Upper bound for the slash command option; the server's own max bet is checked at run time.
    maxBet: 1_000_000_000
} as const;
