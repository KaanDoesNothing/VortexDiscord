import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { parseAutoresponder } from "../../../../lib/api/featureInputs";
import { updateAutoresponder } from "../../../../lib/autoresponders";
import { Dashboard } from "../../../../lib/database";

// PATCH /guilds/:guild/autoresponders/:id with any autoresponder fields.
export class AutoresponderUpdateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const { input, errors } = parseAutoresponder(await req.readBodyJson().catch(() => null) as Record<string, unknown> | null, access.guild, true);
        if (errors.length) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });

        const row = await updateAutoresponder(access.guild.id, Number(req.params.id), input);
        if (!row) return res.status(HttpCodes.NotFound).json({ error: "Autoresponder not found" });
        await Dashboard.addAudit(access.guild.id, access.auth.id, "autoresponder.update", { trigger: row.trigger, fields: Object.keys(input) });
        return res.json(row);
    }
}
