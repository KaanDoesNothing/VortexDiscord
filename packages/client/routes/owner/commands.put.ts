import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { readBody, requireOwner } from "../../lib/api/auth";
import { setGloballyDisabled } from "../../lib/owner";

// PUT /owner/commands with { disabled: string[] }: turn commands off everywhere (maintenance mode).
// Owners can still use disabled commands.
export class OwnerCommandsRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        if (!requireOwner(req, res)) return;
        const body = await readBody(req, res);
        if (!body) return;

        const commands = this.container.stores.get("commands");
        const list = Array.isArray(body.disabled) ? body.disabled.map(String) : null;
        if (!list) return res.status(HttpCodes.BadRequest).json({ error: "disabled must be a list of command names" });

        const unknown = list.filter((name) => !commands.has(name));
        if (unknown.length) return res.status(HttpCodes.BadRequest).json({ error: `Unknown commands: ${unknown.join(", ")}` });

        await setGloballyDisabled([...new Set(list)].sort());
        return res.json({ disabled: list });
    }
}
