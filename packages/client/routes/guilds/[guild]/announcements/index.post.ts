import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { readBody, requireGuildManager } from "../../../../lib/api/auth";
import { parseMessage } from "../../../../lib/api/messageInput";
import { Dashboard, Utility } from "../../../../lib/database";
import { schedule } from "../../../../lib/scheduler";

const MAX_PER_GUILD = 25;

// POST /guilds/:guild/announcements with a message (see messageInput.ts) plus
// { runAt: ISO date, repeatMinutes: null | number (min 60) }.
export class AnnouncementCreateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = await readBody(req, res);
        if (!body) return;

        const { input, errors } = parseMessage(body, access.guild);
        if (!input) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });

        const runAt = new Date(String(body.runAt ?? ""));
        if (Number.isNaN(runAt.getTime()) || runAt.getTime() < Date.now() - 60_000) return res.status(HttpCodes.BadRequest).json({ error: "Pick a time in the future" });

        const repeat = body.repeatMinutes == null || body.repeatMinutes === 0 ? null : Number(body.repeatMinutes);
        if (repeat !== null && (!Number.isInteger(repeat) || repeat < 60 || repeat > 60 * 24 * 365)) {
            return res.status(HttpCodes.BadRequest).json({ error: "Repeat every 1 hour to 1 year, or not at all" });
        }

        if ((await Utility.listTasks(access.guild.id, ["announcement"])).length >= MAX_PER_GUILD) {
            return res.status(HttpCodes.BadRequest).json({ error: `A server can have at most ${MAX_PER_GUILD} scheduled announcements` });
        }

        const id = await schedule({
            type: "announcement",
            guildId: access.guild.id,
            runAt,
            repeatMinutes: repeat,
            payload: { channelId: input.channelId, content: input.content, embed: input.embed },
            createdBy: access.auth.id
        });

        await Dashboard.addAudit(access.guild.id, access.auth.id, "announcement.create", { channelId: input.channelId, runAt: runAt.toISOString(), repeat });
        return res.status(HttpCodes.Created).json({ id });
    }
}
