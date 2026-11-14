import { DBManager } from "./database";

// Shared economy helpers. Balances are global; only the currency's display name/emoji are per server.

export interface Currency {
    name: string;
    emoji: string;
    // "🪙 1,250 Coins"
    format(amount: number): string;
}

export async function getCurrency(guildId: string | null): Promise<Currency> {
    const { currencyName: name, currencyEmoji: emoji } = guildId
        ? (await DBManager.getGuildConfig(guildId)).settings.economy
        : { currencyName: "Coins", currencyEmoji: "🪙" };

    return {
        name,
        emoji,
        format: (amount) => `${emoji ? `${emoji} ` : ""}**${Math.trunc(amount).toLocaleString("en-US")}** ${name}`
    };
}

// Parses "500", "all" or "half" against an available amount. Returns null if invalid.
export function parseAmount(input: string, available: number): number | null {
    const value = input.trim().toLowerCase();
    if (value === "all" || value === "max") return available;
    if (value === "half") return Math.floor(available / 2);
    const n = Number(value.replace(/[,_]/g, ""));
    return Number.isInteger(n) && n > 0 ? n : null;
}

// Random whole number in [min, max].
export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Random item from a list.
export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

// Economy tuning, in one place.
export const ECONOMY = {
    daily: { reward: 500, cooldownMs: 86_400_000, streakBonus: 50 },
    weekly: { reward: 3_000, cooldownMs: 7 * 86_400_000 },
    work: { min: 120, max: 400, cooldownMs: 60 * 60_000 },
    beg: { min: 5, max: 60, chance: 0.6, cooldownMs: 5 * 60_000 },
    crime: { min: 300, max: 1_200, chance: 0.45, fineMin: 200, fineMax: 800, cooldownMs: 2 * 60 * 60_000 },
    // Robber takes 10-35% of the victim's wallet on success.
    rob: { chance: 0.4, minVictimWallet: 200, shareMin: 0.1, shareMax: 0.35, fineMin: 150, fineMax: 600, cooldownMs: 3 * 60 * 60_000 },
    maxBet: 1_000_000
} as const;
