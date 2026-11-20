import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { parseAutoresponder } from "../../../../lib/api/featureInputs";
import { createAutoresponder, listAutoresponders, MAX_AUTORESPONDERS, type AutoresponderInput } from "../../../../lib/autoresponders";
import { Dashboard } from "../../../../lib/database";

// POST /guilds/:guild/autoresponders with { trigger, match, response, reaction?, embed?, channelIds?, cooldownSeconds?, enabled? }
export class AutoresponderCreateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const { input, errors } = parseAutoresponder(await req.readBodyJson().catch(() => null) as Record<string, unknown> | null, access.guild, false);
        if (errors.length) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });
        if ((await listAutoresponders(access.guild.id)).length >= MAX_AUTORESPONDERS) return res.status(HttpCodes.BadRequest).json({ error: `A server can have at most ${MAX_AUTORESPONDERS} autoresponders` });

        const row = await createAutoresponder(access.guild.id, input as AutoresponderInput, access.auth.id);
        await Dashboard.addAudit(access.guild.id, access.auth.id, "autoresponder.create", { trigger: row.trigger });
        return res.status(HttpCodes.Created).json(row);
    }
}
