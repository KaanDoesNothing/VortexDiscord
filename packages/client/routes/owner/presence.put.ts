import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { readBody, requireOwner } from "../../lib/api/auth";
import { setPresence, type PresenceConfig } from "../../lib/owner";

const STATUSES = ["online", "idle", "dnd", "invisible"];
const TYPES = ["Watching", "Playing", "Listening", "Competing", "Custom"];

// PUT /owner/presence with { status, type, text }: the bot's status message. {servers} and {users} are filled in live.
export class OwnerPresenceRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        if (!requireOwner(req, res)) return;
        const body = await readBody(req, res);
        if (!body) return;

        const status = String(body.status);
        const type = String(body.type);
        const text = typeof body.text === "string" ? body.text.trim() : "";

        if (!STATUSES.includes(status)) return res.status(HttpCodes.BadRequest).json({ error: `status must be one of ${STATUSES.join(", ")}` });
        if (!TYPES.includes(type)) return res.status(HttpCodes.BadRequest).json({ error: `type must be one of ${TYPES.join(", ")}` });
        if (!text || text.length > 120) return res.status(HttpCodes.BadRequest).json({ error: "Text must be 1-120 characters" });

        await setPresence({ status, type, text } as PresenceConfig);
        return res.json({ ok: true });
    }
}
