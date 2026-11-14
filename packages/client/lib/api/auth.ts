import { container } from "@sapphire/framework";
import { HttpCodes, type AuthData, type Route } from "@sapphire/plugin-api";
import { PermissionFlagsBits, RouteBases, Routes, type Guild, type RESTGetAPICurrentUserGuildsResult } from "discord.js";
import { isOwner } from "../owner";

type UserGuild = RESTGetAPICurrentUserGuildsResult[number];

const GUILD_CACHE_MS = 60_000;
const guildCache = new Map<string, { expires: number; guilds: UserGuild[] }>();

/** Sends 401 and returns null when the request has no valid login cookie. */
export function requireAuth(req: Route.Request, res: Route.Response): AuthData | null {
    if (!container.server.auth) {
        res.status(HttpCodes.NotImplemented).json({ error: "Dashboard login is not configured on the bot" });
        return null;
    }

    if (!req.auth) {
        res.status(HttpCodes.Unauthorized).json({ error: "Not logged in" });
        return null;
    }

    return req.auth;
}

/** The user's servers from Discord, cached for a minute to stay well under rate limits. */
export async function fetchUserGuilds(auth: AuthData): Promise<UserGuild[]> {
    const cached = guildCache.get(auth.id);
    if (cached && cached.expires > Date.now()) return cached.guilds;

    const response = await fetch(`${RouteBases.api}${Routes.userGuilds()}`, {
        headers: { authorization: `Bearer ${auth.token}` }
    });

    if (!response.ok) {
        if (cached) return cached.guilds;
        throw new Error(`Discord returned ${response.status} for the user's guilds`);
    }

    const guilds = await response.json() as UserGuild[];
    guildCache.set(auth.id, { expires: Date.now() + GUILD_CACHE_MS, guilds });
    return guilds;
}

const MANAGE = PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator;

export const canManageFromOAuth = (guild: UserGuild) => guild.owner || (BigInt(guild.permissions) & MANAGE) !== 0n;

/**
 * Checks that the logged-in user can manage this server, using the bot's own view of the server
 * (so permission changes apply immediately). Sends the error response and returns null on failure.
 */
export async function requireGuildManager(req: Route.Request, res: Route.Response): Promise<{ auth: AuthData; guild: Guild } | null> {
    const auth = requireAuth(req, res);
    if (!auth) return null;

    const guild = container.client.guilds.cache.get(req.params.guild ?? "");
    if (!guild) {
        res.status(HttpCodes.NotFound).json({ error: "The bot is not in this server" });
        return null;
    }

    const member = await guild.members.fetch(auth.id).catch(() => null);
    // Bot owners can open any server (from the admin panel).
    const allowed = isOwner(auth.id) || guild.ownerId === auth.id || member?.permissions.has(MANAGE);

    if (!allowed) {
        res.status(HttpCodes.Forbidden).json({ error: "You need the Manage Server permission" });
        return null;
    }

    return { auth, guild };
}

// Sends 403 and returns null unless the logged-in user is a bot owner (see lib/owner.ts).
export function requireOwner(req: Route.Request, res: Route.Response): AuthData | null {
    const auth = requireAuth(req, res);
    if (!auth) return null;

    if (!isOwner(auth.id)) {
        res.status(HttpCodes.Forbidden).json({ error: "Only the bot owner can do this" });
        return null;
    }
    return auth;
}

// Reads and type-checks a JSON body. Sends 400 and returns null if it isn't an object.
export async function readBody(req: Route.Request, res: Route.Response): Promise<Record<string, unknown> | null> {
    const body = await req.readBodyJson().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        res.status(HttpCodes.BadRequest).json({ error: "Expected a JSON object" });
        return null;
    }
    return body as Record<string, unknown>;
}
