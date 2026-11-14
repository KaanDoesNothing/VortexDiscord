import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { readBody, requireOwner } from "../../../lib/api/auth";
import { blacklistAdd, isOwner } from "../../../lib/owner";

// POST /owner/blacklist with { id, type: "user" | "guild", reason }. Blacklisting a server makes the bot leave it.
export class OwnerBlacklistAddRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const auth = requireOwner(req, res);
        if (!auth) return;
        const body = await readBody(req, res);
        if (!body) return;

        const id = String(body.id ?? "").trim();
        const type = body.type === "guild" ? "guild" : "user";
        const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : "";

        if (!/^\d{15,25}$/.test(id)) return res.status(HttpCodes.BadRequest).json({ error: "That isn't a valid ID" });
        if (type === "user" && isOwner(id)) return res.status(HttpCodes.BadRequest).json({ error: "You can't blacklist a bot owner" });

        await blacklistAdd(id, type, reason, auth.id);
        return res.status(HttpCodes.Created).json({ ok: true });
    }
}
