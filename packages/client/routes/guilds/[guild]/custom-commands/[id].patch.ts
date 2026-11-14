import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { parseCustomCommandInput } from "../../../../lib/api/customCommandInput";
import { CustomCommands, Dashboard } from "../../../../lib/database";

// PATCH /guilds/:guild/custom-commands/:id with any of { name, response, embed, enabled }
export class CustomCommandUpdateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(HttpCodes.BadRequest).json({ error: "Invalid command ID" });

        const { input, errors } = parseCustomCommandInput(await req.readBodyJson().catch(() => null), true);
        if (errors.length) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });
        if (!Object.keys(input).length) return res.status(HttpCodes.BadRequest).json({ error: "Nothing to update" });

        // Renaming onto an existing name hits the unique index; report it as a conflict.
        const updated = await CustomCommands.update(access.guild.id, id, input).catch(() => undefined);
        if (updated === undefined) return res.status(HttpCodes.Conflict).json({ error: `A command named "${input.name}" already exists` });
        if (!updated) return res.status(HttpCodes.NotFound).json({ error: "Command not found" });

        await Dashboard.addAudit(access.guild.id, access.auth.id, "customCommand.update", { name: updated.name, fields: Object.keys(input) });
        return res.json(updated);
    }
}
