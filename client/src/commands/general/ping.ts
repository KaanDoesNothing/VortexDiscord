import { VortexCommand } from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {generalCategoryName} from "./mod";

export class PingCommand extends VortexCommand {
    config = new SlashCommandBuilder().setName("ping").setDescription("Woah Ping command nice hm?!")

    category = generalCategoryName;

    exec(ctx: ChatInputCommandInteraction): InteractionReplyOptions {
        return {content: "Pong!"};
    }
}