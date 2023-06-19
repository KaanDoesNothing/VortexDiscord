import {ChatInputCommandInteraction} from "discord.js";
import {VortexCommand} from "./structures/Command";
import {BaseClass} from "./structures/base";

export class CommandHandler extends BaseClass {
    private cmd: VortexCommand;
    constructor(cmd: VortexCommand) {
        super();
        this.cmd = cmd;
    }

    async exec(ctx: ChatInputCommandInteraction) {
        try {
            const res = await this.cmd.exec(ctx);
            if(typeof res === "object") {
                await ctx.reply(res);
            }

            this.client.statistics.commands.ran++;
        }catch(err) {
            console.log(err);
            await ctx.reply("An error occurred");
        }
    }
}