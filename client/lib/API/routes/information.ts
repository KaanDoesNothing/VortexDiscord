import { Router } from "oak/mod.ts";
import { client } from "../../../index.ts";

export const informationRouter = new Router({prefix: "/information"});

informationRouter.get("/commands", (ctx) => {
    const commands = [];

    client.executables.commands.forEach(cmd => {
        commands.push({
            name: cmd.config.name,
            description: cmd.config.description,
            category: cmd.category,
            permissions: cmd.userPermissions,
            arguments: cmd.config.options || []
        });
    });

    ctx.response.body = commands;
});

informationRouter.get("/client", (ctx) => {
    ctx.response.body = {
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.avatarURL("webp", 2048)
    }
});