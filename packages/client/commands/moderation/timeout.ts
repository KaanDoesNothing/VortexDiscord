import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time, MessageFlags } from "discord.js";
import { auditReason, checkModerationTarget, fetchMember, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction, notifyTarget } from "../../lib/modlog";
import { formatDuration, parseDuration } from "../../lib/scheduler";
import { fail } from "../../lib/structures/embed";
import { VortexCommand } from "../../lib/structures/command";

// Discord's maximum timeout length.
const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000;

// /timeout <user> <duration> [reason]: Discord's built-in timeout (can't chat, react or join voice).
export class TimeoutCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            aliases: ["mute"],
            requiredClientPermissions: ["ModerateMembers"],
            requiredUserPermissions: ["ModerateMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Stop a member from chatting, reacting and joining voice for a while")
        .addUserOption((o) => o.setName("user").setDescription("Who to time out").setRequired(true))
        .addStringOption((o) => o.setName("duration").setDescription("How long, e.g. 10m, 2h, 1d (max 28d)").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Why they're being timed out").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = await fetchMember(ctx.guild!, user.id);
        const durationMs = parseDuration(ctx.options.getString("duration", true));
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));

        if (!durationMs || durationMs > MAX_TIMEOUT) return ctx.reply({ content: "Give a duration like `10m`, `2h` or `1d` (up to 28 days).", flags: MessageFlags.Ephemeral });

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, flags: MessageFlags.Ephemeral });
        if (!member) return ctx.reply({ content: `${user.tag} isn't in this server.`, flags: MessageFlags.Ephemeral });
        if (!member.moderatable) return ctx.reply({ content: `I can't time out ${user.tag}: their role is above mine.`, flags: MessageFlags.Ephemeral });

        await notifyTarget(ctx.guild!, { type: "timeout", moderator: ctx.user, target: user, reason, durationMs });
        await member.timeout(durationMs, auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "timeout", moderator: ctx.user, target: user, reason, durationMs });

        return ctx.reply({ content: `${user.tag} is timed out for ${formatDuration(durationMs)} (until ${time(new Date(Date.now() + durationMs), "f")}).` });
    }
}
