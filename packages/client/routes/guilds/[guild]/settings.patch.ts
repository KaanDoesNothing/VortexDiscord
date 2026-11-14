import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { DBManager, Dashboard } from "../../../lib/database";
import { resolveSettings } from "../../../lib/settings";

// Commands that must stay enabled, or the server could lock itself out.
const PROTECTED_COMMANDS = new Set(["command"]);

// PATCH /guilds/:guild/settings
// Body (all optional): { prefix, disabledCommands, settings: <partial GuildSettings> }
// Partial settings are merged over the current ones, so the dashboard can save one section at a time.
export class GuildSettingsRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const body = await req.readBodyJson().catch(() => null) as Record<string, unknown> | null;
        if (!body || typeof body !== "object") return res.status(HttpCodes.BadRequest).json({ error: "Expected a JSON body" });

        const current = await DBManager.getGuildConfig(access.guild.id);
        const update: Parameters<typeof Dashboard.updateGuildSettings>[1] = {};
        const errors: string[] = [];

        if (body.prefix !== undefined) {
            const prefix = typeof body.prefix === "string" ? body.prefix.trim() : "";
            if (prefix.length < 1 || prefix.length > 10) errors.push("The prefix must be 1 to 10 characters");
            else update.prefix = prefix;
        }

        if (body.disabledCommands !== undefined) {
            const list = body.disabledCommands;
            if (!Array.isArray(list) || !list.every((c) => typeof c === "string")) {
                errors.push("disabledCommands must be a list of command names");
            } else {
                const commands = this.container.stores.get("commands");
                const unknown = list.filter((name) => !commands.has(name));
                if (unknown.length) errors.push(`Unknown commands: ${unknown.join(", ")}`);
                else update.disabledCommands = [...new Set(list as string[])].filter((name) => !PROTECTED_COMMANDS.has(name)).sort();
            }
        }

        if (body.settings !== undefined) {
            const result = resolveSettings(body.settings, current.settings);
            errors.push(...result.errors);
            update.settings = result.settings;
        }

        if (errors.length) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });
        if (!Object.keys(update).length) return res.status(HttpCodes.BadRequest).json({ error: "Nothing to update" });

        await Dashboard.updateGuildSettings(access.guild.id, update);
        // Record which top-level parts changed (not the full values) in the audit trail.
        await Dashboard.addAudit(access.guild.id, access.auth.id, "settings.update", {
            fields: [...Object.keys(update).filter((k) => k !== "settings"), ...Object.keys((body.settings as object | undefined) ?? {})]
        });

        return res.json(await DBManager.getGuildConfig(access.guild.id));
    }
}
