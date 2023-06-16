import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {nekosLife} from "../../lib/utils/NekosLife";
import {VortexRolePlayEmbed} from "../../lib/structures/Embed";
import {roleplayCategoryName} from "./mod";

export class FeedCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("feed")
        .setDescription("Feed someone")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(true));

    category = roleplayCategoryName;
    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user = ctx.options.getUser("user");

        const url = (await nekosLife.cuddle()).url;

        const embed = VortexRolePlayEmbed(ctx.user.username, user.username, "fed", url)

        await ctx.reply({embeds: [embed]});
    }
}