import { container } from "@sapphire/framework";
import { ActivityType, Team, type PresenceStatusData } from "discord.js";
import { Utility } from "./database";

// Bot-owner features: who counts as an owner, the global blacklist, globally disabled commands
// and the bot's status message. Settings are stored in bot_config / blacklist and cached here.

export interface PresenceConfig {
    status: PresenceStatusData;
    // Watching | Playing | Listening | Competing | Custom
    type: "Watching" | "Playing" | "Listening" | "Competing" | "Custom";
    // {servers} and {users} are replaced with live counts.
    text: string;
}

export const DEFAULT_PRESENCE: PresenceConfig = { status: "online", type: "Watching", text: "/help · {servers} servers" };

const state = {
    owners: new Set<string>(),
    blacklist: new Map<string, { type: string; reason: string }>(),
    disabledCommands: new Set<string>(),
    presence: DEFAULT_PRESENCE
};

// Owners = the Discord application's owner (or every member of its team) + OWNER_IDS in .env.
export async function loadOwners() {
    const ids = new Set((Bun.env.OWNER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    const app = await container.client.application?.fetch().catch(() => null);
    if (app?.owner instanceof Team) app.owner.members.forEach((m) => ids.add(m.id));
    else if (app?.owner) ids.add(app.owner.id);
    state.owners = ids;
    return ids;
}

export const isOwner = (userId: string) => state.owners.has(userId);
export const getOwners = () => [...state.owners];

// ---------- Blacklist ----------

export async function loadBlacklist() {
    const rows = await Utility.listBlacklist();
    state.blacklist = new Map(rows.map((r) => [r.id, { type: r.type, reason: r.reason }]));
}

export const isBlacklisted = (...ids: (string | null | undefined)[]) => ids.some((id) => id && state.blacklist.has(id));

export async function blacklistAdd(id: string, type: "user" | "guild", reason: string, by: string) {
    await Utility.addToBlacklist(id, type, reason, by);
    state.blacklist.set(id, { type, reason });

    // A blacklisted server: leave it right away.
    if (type === "guild") await container.client.guilds.cache.get(id)?.leave().catch(() => null);
}

export async function blacklistRemove(id: string) {
    state.blacklist.delete(id);
    return Utility.removeFromBlacklist(id);
}

// ---------- Globally disabled commands (maintenance) ----------

export async function loadDisabledCommands() {
    state.disabledCommands = new Set(await Utility.getBotConfig<string[]>("disabledCommands", []));
}

export const isGloballyDisabled = (command: string) => state.disabledCommands.has(command);
export const getGloballyDisabled = () => [...state.disabledCommands];

export async function setGloballyDisabled(commands: string[]) {
    state.disabledCommands = new Set(commands);
    await Utility.setBotConfig("disabledCommands", [...state.disabledCommands]);
}

// ---------- Presence ----------

export async function loadPresence() {
    state.presence = { ...DEFAULT_PRESENCE, ...(await Utility.getBotConfig<Partial<PresenceConfig>>("presence", {})) };
    applyPresence();
}

export const getPresence = () => state.presence;

export async function setPresence(presence: PresenceConfig) {
    state.presence = presence;
    await Utility.setBotConfig("presence", presence);
    applyPresence();
}

// Sets the bot's status from the saved config, filling in live counts.
export function applyPresence() {
    const client = container.client;
    if (!client.isReady()) return;

    const users = client.guilds.cache.reduce((sum, g) => sum + g.memberCount, 0);
    const name = state.presence.text
        .replace("{servers}", client.guilds.cache.size.toLocaleString("en-US"))
        .replace("{users}", users.toLocaleString("en-US"));

    client.user.setPresence({
        status: state.presence.status,
        activities: [{ name, type: ActivityType[state.presence.type], ...(state.presence.type === "Custom" ? { state: name } : {}) }]
    });
}
