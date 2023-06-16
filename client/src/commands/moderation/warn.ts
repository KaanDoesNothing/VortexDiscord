import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder} from "discord.js";
import {GuildWarnTable} from "../../lib/Database";
import {moderationCategoryName} from "./mod";

export class WarnCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("reason").setRequired(false));

    category = moderationCategoryName;

    userPermissions: PermissionsString[] = ["ModerateMembers"];

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user = ctx.options.getUser("user");
        const reason = ctx.options.getString("reason") || "None";
        await (await GuildWarnTable.create({guild_id: ctx.guild?.id, user_id: user.id, reason})).save();

        await ctx.reply(`${user.tag} has been warned.`);
    }
}