import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, PermissionsString, SlashCommandBuilder} from "discord.js";
import {moderationCategoryName} from "./mod";

export class BanCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("reason").setRequired(false));

    category = moderationCategoryName;

    clientPermissions: PermissionsString[] = ["BanMembers"];
    userPermissions: PermissionsString[] = ["BanMembers"];

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const user = ctx.options.getUser("user");
        const reason = ctx.options.getString("reason") || "None";
        
        const member = await ctx.guild.members.cache.get(user.id);
        if(!member) return;

        if(!member.bannable) {
            await ctx.reply(`You can't ban the following user: ${user.tag}.`);
            return;
        }

        await member.ban({reason});

        return {content: `${user.tag} has been banned.`};
    }
}