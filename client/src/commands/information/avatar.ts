import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {VortexEmbed} from "../../lib/structures/Embed";
import {informationCategoryName} from "./mod";

export class AvatarCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Avatar")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(false));

    category = informationCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const user = ctx.options.getUser("user") || ctx.user;

        const embed = new VortexEmbed()
            .setTitle(`${user.tag}'s Avatar`)
            .setImage(user.avatarURL());

        return {embeds: [embed]};
    }
}