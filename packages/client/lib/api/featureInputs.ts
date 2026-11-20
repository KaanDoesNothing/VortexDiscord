import type { Guild } from "discord.js";
import { MATCH_TYPES, type AutoresponderInput } from "../autoresponders";
import type { ShopItemInput } from "../database/economy";

// Validation for dashboard input to the shop and autoresponder routes. Each parser returns the
// cleaned fields (only those given when `partial`) plus a list of readable errors.

const SNOWFLAKE = /^\d{15,25}$/;
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export function parseShopItem(body: Record<string, unknown> | null, guild: Guild, partial: boolean) {
    const errors: string[] = [];
    const out: Partial<ShopItemInput> = {};
    const b = body ?? {};
    const has = (k: string) => b[k] !== undefined;

    if (!partial || has("name")) {
        const name = str(b.name)?.trim() ?? "";
        if (!name || name.length > 50) errors.push("Name must be 1-50 characters"); else out.name = name;
    }
    if (!partial || has("price")) {
        const price = Number(b.price);
        if (!Number.isInteger(price) || price < 0 || price > 1_000_000_000) errors.push("Price must be a whole number from 0 to 1,000,000,000"); else out.price = price;
    }
    if (has("description") || !partial) {
        const d = str(b.description) ?? "";
        if (d.length > 200) errors.push("Description can be at most 200 characters"); else out.description = d;
    }
    if (has("emoji") || !partial) out.emoji = (str(b.emoji) ?? "").trim().slice(0, 64);
    for (const key of ["roleId", "requiredRoleId"] as const) {
        if (!has(key) && partial) continue;
        const id = b[key] ? String(b[key]) : null;
        if (id && (!SNOWFLAKE.test(id) || !guild.roles.cache.has(id))) { errors.push(`${key === "roleId" ? "The role" : "The required role"} doesn't exist`); continue; }
        if (key === "roleId" && id) {
            const role = guild.roles.cache.get(id)!;
            if (!role.editable || role.managed) { errors.push(`The bot can't give "${role.name}" (move the bot's role above it)`); continue; }
        }
        out[key] = id;
    }
    if (has("stock") || !partial) {
        const stock = b.stock === null || b.stock === "" || b.stock === undefined ? null : Number(b.stock);
        if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000)) errors.push("Stock must be empty (unlimited) or 0 to 1,000,000"); else out.stock = stock;
    }
    if (has("maxPerUser") || !partial) {
        const max = Number(b.maxPerUser ?? 0);
        if (!Number.isInteger(max) || max < 0 || max > 10_000) errors.push("Max per member must be 0 (no limit) to 10,000"); else out.maxPerUser = max;
    }
    if (has("enabled") || !partial) out.enabled = b.enabled !== false;
    return { input: out, errors };
}

export function parseAutoresponder(body: Record<string, unknown> | null, guild: Guild, partial: boolean) {
    const errors: string[] = [];
    const out: Partial<AutoresponderInput> = {};
    const b = body ?? {};
    const has = (k: string) => b[k] !== undefined;

    if (!partial || has("trigger")) {
        const trigger = str(b.trigger)?.trim() ?? "";
        if (!trigger || trigger.length > 200) errors.push("Trigger must be 1-200 characters"); else out.trigger = trigger;
    }
    if (!partial || has("match")) {
        const match = str(b.match) ?? "contains";
        if (!(MATCH_TYPES as readonly string[]).includes(match)) errors.push(`Match must be one of ${MATCH_TYPES.join(", ")}`); else out.match = match;
    }
    if (!partial || has("response")) {
        const response = str(b.response) ?? "";
        if (response.length > 2000) errors.push("Response can be at most 2000 characters"); else out.response = response;
    }
    if (!partial || has("reaction")) out.reaction = (str(b.reaction) ?? "").trim().slice(0, 64);
    if (!partial || has("embed")) out.embed = b.embed === true;
    if (!partial || has("enabled")) out.enabled = b.enabled !== false;
    if (!partial || has("cooldownSeconds")) {
        const cd = Number(b.cooldownSeconds ?? 10);
        if (!Number.isInteger(cd) || cd < 0 || cd > 86_400) errors.push("Cooldown must be 0 to 86,400 seconds"); else out.cooldownSeconds = cd;
    }
    if (!partial || has("channelIds")) {
        const ids = Array.isArray(b.channelIds) ? b.channelIds.map(String) : [];
        if (ids.length > 50 || ids.some((id) => !guild.channels.cache.has(id))) errors.push("Pick up to 50 existing channels"); else out.channelIds = [...new Set(ids)];
    }
    if (!partial && !out.response && !out.reaction) errors.push("Give a response, a reaction, or both");
    return { input: out, errors };
}
