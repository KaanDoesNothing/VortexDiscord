import { container } from "@sapphire/framework";
import type { Route } from "@sapphire/plugin-api";

const queryString = (req: Route.Request, key: string) => {
    const value = req.query[key];
    return typeof value === "string" && value.length ? value : undefined;
};

export function getQuery(req: Route.Request, key: string) {
    return queryString(req, key);
}

/** Reads ?page=&limit= with sane bounds. */
export function getPage(req: Route.Request, defaultLimit = 25) {
    const page = Math.max(1, Math.floor(Number(queryString(req, "page") ?? 1)) || 1);
    const limit = Math.min(100, Math.max(1, Math.floor(Number(queryString(req, "limit") ?? defaultLimit)) || defaultLimit));
    return { page, limit };
}

export interface ResolvedUser {
    id: string;
    username: string;
    avatar: string;
}

/** Looks up display info for a set of user IDs (cache first, then Discord). Unknown IDs are skipped. */
export async function resolveUsers(ids: Iterable<string | null | undefined>) {
    const unique = [...new Set([...ids].filter((id): id is string => Boolean(id)))];
    const users = container.client.users;

    const resolved = await Promise.all(unique.map(async (id) => {
        const user = users.cache.get(id) ?? await users.fetch(id).catch(() => null);
        if (!user) return null;

        return [id, {
            id,
            username: user.globalName ?? user.username,
            avatar: user.displayAvatarURL({ size: 64, extension: "webp" })
        }] as const;
    }));

    return Object.fromEntries(resolved.filter((entry) => entry !== null)) as Record<string, ResolvedUser>;
}
