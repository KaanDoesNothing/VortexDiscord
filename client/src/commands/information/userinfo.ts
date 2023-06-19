import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {VortexCommand} from "../../lib/structures/Command";
import {VortexEmbed} from "../../lib/structures/Embed";
import {informationCategoryName} from "./mod";

export class UserInfoCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("User Information")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(false));

    category = informationCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const user = ctx.options.getUser("user") || ctx.user;
        const member = ctx.guild.members.cache.get(user.id);
        const roles = member.roles.cache;

        const embed = new VortexEmbed()
            .setThumbnail(user.avatarURL() as string)
            .addField("Name", `@${user.username}`, true)
            .addField("ID", user.id.toString(), true)
            .addField("Joined", new Date(member.joinedAt).toLocaleString())
            .addField("Created", user.createdAt.toLocaleString(), true)
            .setFooter({text: `Roles: ${roles.map(role => `${role.name}`).join(", ")}`});

        return {embeds: [embed]};
    }
}