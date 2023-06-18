import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {generalCategoryName} from "./mod";

export class AnnouncementCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("announcement")
        .setDescription("A little update");

    category = generalCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        return {content: `The bot wasn't updated for a while, this is due to a lack of time, I've finally updated most of the bot and will be updating it as time goes on. some commands might be missing, you can take a look with /help`};
    }
}