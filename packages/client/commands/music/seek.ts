import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";
import { formatTime, parseTime } from "../../lib/music/format";

// /seek <time>: jump to a point in the song. Accepts 1:30, 90, +30 or -10 (relative).
export class SeekCommand extends MusicCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("seek")
        .setDescription("Jump to a time in the current song, e.g. 1:30, or +30 / -10 seconds")
        .addStringOption((o) => o.setName("time").setDescription("Like 1:30, 90, +30 or -10").setMaxLength(12).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: "requester" });
        if (!ready) return;
        const { player } = ready;

        const input = ctx.options.getString("time", true).trim();
        // "+30" / "-10" move relative to the current position.
        const relative = /^[+-]/.test(input);
        const amount = parseTime(input.replace(/^[+-]/, ""));
        if (amount === null) return ctx.reply({ content: "Use a time like `1:30`, `90`, `+30` or `-10`.", flags: MessageFlags.Ephemeral });

        const target = relative ? player.position + (input.startsWith("-") ? -amount : amount) : amount;
        const error = await Music.seek(player, target);
        if (error) return ctx.reply({ content: error, flags: MessageFlags.Ephemeral });

        return ctx.reply({ content: `⏩ Jumped to \`${formatTime(Math.max(0, target))}\`.` });
    }
}
