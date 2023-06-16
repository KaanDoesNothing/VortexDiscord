import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {VortexEmbed} from "../../lib/structures/Embed";
import {moderationCategoryName} from "./mod";

export class EmbedCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Send an embed")
        .addStringOption((arg) => arg.setName("title").setDescription("title").setRequired(true))
        .addStringOption((arg) => arg.setName("content").setDescription("content").setRequired(true));

    category = moderationCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const title = ctx.options.getString("title");
        const content = ctx.options.getString("content");
        
        const embed = new VortexEmbed()
            .setTitle(title)
            .setDescription(content);

        await ctx.reply({embeds: [embed]});
    }
}