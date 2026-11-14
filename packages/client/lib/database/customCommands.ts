import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { customCommandCache } from "./cache";
import { customCommands, type CustomCommand } from "./schema";

// Custom commands are per-server "prefix + name → response" commands made in the dashboard.

export const NAME_PATTERN = /^[a-z0-9_-]{1,32}$/;
export const RESPONSE_MAX = 2000;

// All commands for a server, ordered by name.
export function list(guildId: string): Promise<CustomCommand[]> {
    return db.select().from(customCommands).where(eq(customCommands.guildId, guildId)).orderBy(asc(customCommands.name));
}

// Name → command lookup used by the message listener. Cached, since it runs on every prefixed message.
export async function findByName(guildId: string, name: string): Promise<CustomCommand | undefined> {
    const byName: Map<string, CustomCommand> = await customCommandCache.get(guildId, async () => {
        const rows = await list(guildId);
        return new Map(rows.filter((row) => row.enabled).map((row) => [row.name, row]));
    });

    return byName.get(name);
}

export async function create(guildId: string, input: { name: string; response: string; embed?: boolean; enabled?: boolean; createdBy?: string }) {
    const [row] = await db.insert(customCommands).values({ guildId, ...input }).onConflictDoNothing().returning();
    customCommandCache.delete(guildId);
    return row ?? null; // null = a command with that name already exists
}

export async function update(guildId: string, id: number, input: Partial<{ name: string; response: string; embed: boolean; enabled: boolean }>) {
    const [row] = await db.update(customCommands).set(input)
        .where(and(eq(customCommands.guildId, guildId), eq(customCommands.id, id)))
        .returning();
    customCommandCache.delete(guildId);
    return row ?? null;
}

export async function remove(guildId: string, id: number) {
    const [row] = await db.delete(customCommands)
        .where(and(eq(customCommands.guildId, guildId), eq(customCommands.id, id)))
        .returning({ id: customCommands.id });
    customCommandCache.delete(guildId);
    return Boolean(row);
}

// Fire-and-forget usage counter (doesn't touch the cache; uses aren't needed for lookups).
export async function recordUse(id: number) {
    await db.update(customCommands).set({ uses: sql`${customCommands.uses} + 1` }).where(eq(customCommands.id, id));
}
