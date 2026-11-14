import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { parseCustomCommandInput } from "../../../../lib/api/customCommandInput";
import { CustomCommands, Dashboard } from "../../../../lib/database";

// Keeps a single server from creating an unbounded number of commands.
const MAX_PER_GUILD = 100;

// POST /guilds/:guild/custom-commands with { name, response, embed?, enabled? }
export class CustomCommandCreateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const { input, errors } = parseCustomCommandInput(await req.readBodyJson().catch(() => null), false);
        if (errors.length) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });

        const existing = await CustomCommands.list(access.guild.id);
        if (existing.length >= MAX_PER_GUILD) {
            return res.status(HttpCodes.BadRequest).json({ error: `A server can have at most ${MAX_PER_GUILD} custom commands` });
        }

        const created = await CustomCommands.create(access.guild.id, {
            name: input.name!,
            response: input.response!,
            embed: input.embed,
            enabled: input.enabled,
            createdBy: access.auth.id
        });

        if (!created) return res.status(HttpCodes.Conflict).json({ error: `A command named "${input.name}" already exists` });
        await Dashboard.addAudit(access.guild.id, access.auth.id, "customCommand.create", { name: input.name });

        return res.status(HttpCodes.Created).json(created);
    }
}
