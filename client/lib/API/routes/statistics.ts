import { Router } from "oak/mod.ts";
import { client } from "../../../index.ts";

export const statisticsRouter = new Router({prefix: "/statistics"});

statisticsRouter.get("/", async (ctx) => {
    const users = (await client.guilds.array()).reduce((prev, next) => prev + next.memberCount || 0, 0);
    ctx.response.body = {guilds: await client.guilds.size(), channels: await client.channels.size(), users};
});