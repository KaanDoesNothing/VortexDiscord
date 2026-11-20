import { HttpCodes, Route } from "@sapphire/plugin-api";
import { timingSafeEqual } from "node:crypto";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { rewardVote, VOTE_REWARD } from "../../lib/botlists";

// POST /webhooks/topgg: top.gg calls this when someone votes. Set the webhook URL on top.gg to
// <API URL>/webhooks/topgg and its Authorization to the same value as TOPGG_WEBHOOK_SECRET.
// The voter gets VOTE_REWARD coins in the global economy (double on weekends) and a thank-you DM.
export class TopggWebhookRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const secret = Bun.env.TOPGG_WEBHOOK_SECRET;
        if (!secret) return res.status(HttpCodes.NotFound).json({ error: "Vote webhook isn't configured" });

        const given = Buffer.from(String(req.headers.authorization ?? ""));
        const expected = Buffer.from(secret);
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) return res.status(HttpCodes.Unauthorized).json({ error: "Bad authorization" });

        const body = await req.readBodyJson().catch(() => null) as { user?: string; type?: string; isWeekend?: boolean } | null;
        const userId = body?.user;
        if (!userId || !/^\d{15,25}$/.test(userId)) return res.status(HttpCodes.BadRequest).json({ error: "Missing user" });
        // top.gg's "Test" button sends type "test".
        if (body.type === "test") return res.json({ ok: true, test: true });

        const rewarded = await rewardVote(userId, body.isWeekend === true);
        if (rewarded) {
            const amount = body.isWeekend ? VOTE_REWARD * 2 : VOTE_REWARD;
            const user = await this.container.client.users.fetch(userId).catch(() => null);
            await user?.send(`💜 Thanks for voting! You got 🪙 **${amount.toLocaleString("en-US")}** coins${body.isWeekend ? " (double on weekends!)" : ""}. You can vote again in 12 hours.`).catch(() => null);
        }
        return res.json({ ok: true, rewarded });
    }
}
