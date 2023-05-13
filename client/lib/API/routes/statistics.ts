import { Router } from "oak/mod.ts";
import { client } from "../../../index.ts";

export const statisticsRouter = new Router({prefix: "/statistics"});

statisticsRouter.get("/", async (ctx) => {
    ctx.response.body = {guilds: await client.guilds.size(), channels: await client.channels.size(), users: await client.users.size()};
});