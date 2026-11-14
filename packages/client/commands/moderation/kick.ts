import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { auditReason, checkModerationTarget } from "../../lib/moderation";
import { logModAction } from "../../lib/modlog";

// /kick <user> [reason]
export class KickCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["KickMembers"],
            requiredUserPermissions: ["KickMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Remove a member from the server (they can rejoin with an invite)")
        .addUserOption((arg) => arg.setName("user").setDescription("Who to kick").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("Why they're being kicked (shown in the mod log and audit log)").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = ctx.guild!.members.cache.get(user.id) ?? null;
        const reason = ctx.options.getString("reason") ?? "None";

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, ephemeral: true });
        if (!member) return ctx.reply({ content: `${user.tag} isn't in this server.`, ephemeral: true });
        if (!member.kickable) return ctx.reply({ content: `I can't kick ${user.tag}: their role is above mine.`, ephemeral: true });

        await member.kick(auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "kick", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag} has been kicked.` });
    }
}
