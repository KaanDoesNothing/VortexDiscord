import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { fail } from "../../lib/structures/embed";
import { VortexCommand } from "../../lib/structures/command";
import { auditReason, checkModerationTarget, fetchMember, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction, notifyTarget } from "../../lib/modlog";

// /deafen <user> [reason]: server-deafens and mutes a member who is in a voice channel.
export class DeafenCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["DeafenMembers", "MuteMembers"],
            requiredUserPermissions: ["DeafenMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("deafen")
        .setDescription("Server-deafen and mute a member who is in a voice channel")
        .addUserOption((arg) => arg.setName("user").setDescription("Who to deafen").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("Why they're being deafened").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = await fetchMember(ctx.guild!, user.id);
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, flags: MessageFlags.Ephemeral });
        // Discord only allows (un)deafening someone who is connected to voice.
        if (!member?.voice.channel) return ctx.reply({ content: `${user.tag} isn't in a voice channel.`, flags: MessageFlags.Ephemeral });

        await member.voice.setDeaf(true, auditReason(ctx.user, reason));
        await member.voice.setMute(true, auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "deafen", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag} has been deafened.` });
    }
}
