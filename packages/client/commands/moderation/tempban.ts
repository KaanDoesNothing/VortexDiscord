import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { auditReason, checkModerationTarget } from "../../lib/moderation";
import { logModAction, scheduleUnban, sendAppealDm } from "../../lib/modlog";
import { formatDuration, parseDuration } from "../../lib/scheduler";
import { VortexCommand } from "../../lib/structures/command";

// /tempban <user> <duration> [reason]: bans now and unbans automatically later (survives restarts).
export class TempbanCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["BanMembers"],
            requiredUserPermissions: ["BanMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("tempban")
        .setDescription("Ban someone for a set time; they're unbanned automatically")
        .addUserOption((o) => o.setName("user").setDescription("Who to ban").setRequired(true))
        .addStringOption((o) => o.setName("duration").setDescription("How long, e.g. 1d, 12h, 2w").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Why they're being banned").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = ctx.guild!.members.cache.get(user.id) ?? null;
        const durationMs = parseDuration(ctx.options.getString("duration", true));
        const reason = ctx.options.getString("reason") ?? "None";

        if (!durationMs || durationMs < 60_000) return ctx.reply({ content: "Give a duration like `12h`, `1d` or `2w`.", ephemeral: true });

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, ephemeral: true });
        if (member && !member.bannable) return ctx.reply({ content: `I can't ban ${user.tag}: their role is above mine.`, ephemeral: true });

        await sendAppealDm(ctx.guild!, user);
        await ctx.guild!.bans.create(user.id, { reason: auditReason(ctx.user, `${reason} (temporary: ${formatDuration(durationMs)})`) });
        await scheduleUnban(ctx.guild!, user, durationMs, ctx.user);
        await logModAction(ctx.guild!, { type: "tempban", moderator: ctx.user, target: user, reason, durationMs });

        return ctx.reply({ content: `${user.tag} is banned for ${formatDuration(durationMs)}. They'll be unbanned ${time(new Date(Date.now() + durationMs), "R")}.` });
    }
}
