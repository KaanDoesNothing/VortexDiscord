import {Router} from "express";
import {client} from "../../../index";
import {usageParser} from "../../slash/utils";

export const informationRouter = Router();

informationRouter.get("/statistics", (req, res) => {
    return res.json({
        guilds: client.guilds.cache.size,
        channels: client.channels.cache.size,
        users: client.guilds.cache.reduce((prev, next) => prev + next.memberCount, 0)
    })
});

informationRouter.get("/client", (req, res) => {
    return res.json({
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.avatarURL()
    });
})

informationRouter.get("/commands", (req, res) => {
    const commands = [];

    client.executables.commands.forEach(cmd => {
        if(cmd.hidden) return;

        commands.push({
            name: cmd.config.name,
            description: cmd.config.description,
            category: cmd.category,
            permissions: cmd.userPermissions,
            arguments: cmd.config.options || [],
            usage: new usageParser(cmd).exec()
        });
    });

    return res.json(commands);
});