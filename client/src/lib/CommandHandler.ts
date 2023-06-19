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
            this.client.statistics.commands.ran++;

            if(this.cmd.checks) {
                for (const i in this.cmd.checks) {
                    const check = this.cmd.checks[i];

                    const res = check({client: this.client, ctx});
                    if(res) return await ctx.reply(res);
                }
            }

            const res = await this.cmd.exec(ctx);
            if(typeof res === "object") {
                await ctx.reply(res);
            }
        }catch(err) {
            console.log(err);
            await ctx.reply("An error occurred");
        }
    }
}