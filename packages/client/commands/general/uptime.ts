import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { formatDuration } from "../../lib/scheduler";
import { VortexCommand } from "../../lib/structures/command";

// /uptime: how long the bot has been online.
export class UptimeCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("How long the bot has been online");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const uptime = ctx.client.uptime ?? 0;
        return ctx.reply({ content: `🟢 Online for **${formatDuration(uptime)}** (since ${time(new Date(Date.now() - uptime), "f")}).` });
    }
}
