import { VortexCommand } from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {generalCategoryName} from "./mod";

export class PingCommand extends VortexCommand {
    config = new SlashCommandBuilder().setName("ping").setDescription("Woah Ping command nice hm?!")

    category = generalCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        await ctx.reply("Pong!");
    }
}