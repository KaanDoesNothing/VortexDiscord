import { Router } from "oak/mod.ts";
import { client } from "../../../index.ts";
import { GuildTable } from "../../Database.ts";

export const guildRouter = new Router({prefix: "/guild"});

guildRouter.post("/information", async (ctx) => {
    const {guild_id} = await ctx.request.body({type: "json"}).value;

    const guildInfo = await client.guilds.get(guild_id);

    ctx.response.body = {name: guildInfo.name, id: guildInfo.id, icon: guildInfo.iconURL(), statistics: {
        users: guildInfo.memberCount,
        channels: await guildInfo.channels.size(),
        roles: await guildInfo.roles.size()
    }};
});

guildRouter.post("/settings/get", async (ctx) => {
    const {guild_id} = await ctx.request.body({type: "json"}).value;

    const guildData = await GuildTable.findOne({guild_id});

    ctx.response.body = guildData.settings;
});

guildRouter.post("/settings/update", async (ctx) => {
    const {guild_id, data} = await ctx.request.body({type: "json"}).value;

    const guildData = await GuildTable.findOne({guild_id});
    guildData.set("settings", data);

    await guildData.save();

    ctx.response.body = guildData.settings;
});