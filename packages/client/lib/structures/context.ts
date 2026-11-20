import { AsyncLocalStorage } from "node:async_hooks";

// Which server the current code is running for. Set around every command run (see VortexCommand)
// and interaction handler, so deep helpers like VortexEmbed can apply that server's branding
// without every call site passing the guild along.
const guildContext = new AsyncLocalStorage<string | null>();

export const runInGuild = <T>(guildId: string | null, fn: () => T): T => guildContext.run(guildId, fn);
export const currentGuildId = () => guildContext.getStore() ?? null;

// Per-server embed branding, kept in sync by DBManager.getGuildConfig (so it's always as fresh as
// the cached settings). Read synchronously because embeds are built synchronously.
export interface Branding { color: number | null; footer: string }
const branding = new Map<string, Branding>();

export function setBranding(guildId: string, value: { color: string; footer: string }) {
    branding.set(guildId, { color: value.color ? parseInt(value.color.slice(1), 16) : null, footer: value.footer });
}

export function brandingFor(guildId: string | null = currentGuildId()): Branding | undefined {
    return guildId ? branding.get(guildId) : undefined;
}
