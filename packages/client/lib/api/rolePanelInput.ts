import type { Guild } from "discord.js";

const SNOWFLAKE = /^\d{15,25}$/;

export interface RolePanelInput {
    channelId: string;
    title: string;
    description: string;
    mode: "toggle" | "single";
    roles: { roleId: string; label: string; emoji?: string }[];
}

// Validates a role panel from the dashboard. Checks that the channel and roles exist and
// that the bot is allowed to hand out each role.
export function parseRolePanel(body: Record<string, unknown>, guild: Guild): { input?: RolePanelInput; errors: string[] } {
    const errors: string[] = [];

    const channelId = typeof body.channelId === "string" && SNOWFLAKE.test(body.channelId) ? body.channelId : "";
    if (!guild.channels.cache.get(channelId)?.isSendable()) errors.push("Pick a channel the bot can post in");

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 256) errors.push("Title must be 1-256 characters");

    const description = typeof body.description === "string" ? body.description : "";
    if (description.length > 2000) errors.push("Description can be at most 2000 characters");

    const mode = body.mode === "single" ? "single" : "toggle";

    const roles: RolePanelInput["roles"] = [];
    if (!Array.isArray(body.roles) || !body.roles.length || body.roles.length > 25) {
        errors.push("Add between 1 and 25 roles");
    } else {
        for (const raw of body.roles as Record<string, unknown>[]) {
            const role = guild.roles.cache.get(String(raw?.roleId ?? ""));
            if (!role) { errors.push("One of the roles no longer exists"); continue; }
            if (!role.editable || role.managed) { errors.push(`The bot can't give "${role.name}" (move the bot's role above it)`); continue; }

            const label = (typeof raw.label === "string" && raw.label.trim()) || role.name;
            const emoji = typeof raw.emoji === "string" && raw.emoji.trim() ? raw.emoji.trim().slice(0, 64) : undefined;
            roles.push({ roleId: role.id, label: label.slice(0, 80), emoji });
        }
        if (new Set(roles.map((r) => r.roleId)).size !== roles.length) errors.push("Each role can only be on a panel once");
    }

    return errors.length ? { errors } : { input: { channelId, title, description, mode, roles }, errors };
}
