import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { auditReason } from "../../lib/moderation";
import { formatDuration, parseDuration } from "../../lib/scheduler";
import { VortexCommand } from "../../lib/structures/command";

// /slowmode <delay>: sets how long members wait between messages. "off" or "0" removes it.
export class SlowmodeCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["ManageChannels"],
            requiredUserPermissions: ["ManageChannels"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Make members wait between messages in this channel")
        .addStringOption((o) => o.setName("delay").setDescription("e.g. 5s, 1m, 2h (max 6h), or off").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const input = ctx.options.getString("delay", true).trim().toLowerCase();
        const channel = ctx.channel;
        if (!channel || !("setRateLimitPerUser" in channel)) return ctx.reply({ content: "Slowmode can't be set here.", flags: MessageFlags.Ephemeral });

        const ms = input === "off" || input === "0" ? 0 : parseDuration(input);
        // Discord allows 0 to 21600 seconds.
        if (ms === null || ms > 21_600_000) return ctx.reply({ content: "Give a delay like `5s`, `1m` or `2h` (max 6h), or `off`.", flags: MessageFlags.Ephemeral });

        await channel.setRateLimitPerUser(Math.round(ms / 1000), auditReason(ctx.user, "Slowmode"));

        return ctx.reply({ content: ms ? `🐢 Slowmode set to ${formatDuration(ms)}.` : "Slowmode is off." });
    }
}
