import {ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder} from "discord.js";
import {VortexCommand} from "../../lib/structures/Command";
import {moderationCategoryName} from "./mod";

export class KickCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("reason").setRequired(false));

    category = moderationCategoryName;

    clientPermissions: PermissionsString[] = ["KickMembers"];
    userPermissions: PermissionsString[] = ["KickMembers"];

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user = ctx.options.getUser("user");
        const reason = ctx.options.getString("reason") || "None";
        
        const member = await ctx.guild.members.cache.get(user.id);
        if(!member) return;

        if(!member.kickable) {
            await ctx.reply(`You can't kick the following user: ${user.tag}.`);
            return;
        }

        await member.kick(reason);

        await ctx.reply(`${user.tag} has been kicked.`);
    }
}