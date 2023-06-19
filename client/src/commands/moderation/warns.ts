import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, PermissionsString, SlashCommandBuilder} from "discord.js";
import {GuildWarnTable} from "../../lib/Database";
import {VortexEmbed} from "../../lib/structures/Embed";
import {moderationCategoryName} from "./mod";

export class WarnsCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("warns")
        .setDescription("Warns")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(true));

    category = moderationCategoryName;

    userPermissions: PermissionsString[] = ["ModerateMembers"];

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const user = ctx.options.getUser("user");

        const warnList = await GuildWarnTable.find({guild_id: ctx.guild?.id, user_id: user.id}).sort({"createdAt": "desc"}).limit(10);

        const embed = new VortexEmbed()
            .setTitle(`${user.tag}'s warnings`);

        for (const i in warnList) {
            const row = warnList[i];

            embed.addField(row.createdAt.toLocaleString(), row.reason);
        }

        return {embeds: [embed]};
    }
}