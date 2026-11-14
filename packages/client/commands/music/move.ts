import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";
import { trackLink } from "../../lib/music/format";

// /move <from> <to>: reorder the queue.
export class MoveCommand extends MusicCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("move")
        .setDescription("Move a song to a different place in the queue")
        .addIntegerOption((o) => o.setName("from").setDescription("Current position in /queue").setMinValue(1).setRequired(true))
        .addIntegerOption((o) => o.setName("to").setDescription("New position").setMinValue(1).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const { player } = ready;

        const from = ctx.options.getInteger("from", true);
        const to = ctx.options.getInteger("to", true);
        const track = await Music.move(player, from - 1, to - 1);
        if (!track) return ctx.reply({ content: `Positions must be between 1 and ${player.queue.tracks.length}.`, ephemeral: true });

        return ctx.reply({ content: `↕️ Moved ${trackLink(track)} to #${to}.`, allowedMentions: { parse: [] } });
    }
}
