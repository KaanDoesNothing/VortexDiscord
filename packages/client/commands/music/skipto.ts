import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { MusicCommand } from "../../lib/music/command";
import { trackLink } from "../../lib/music/format";

// /skipto <position>: jump straight to a song in the queue (skipping everything before it).
export class SkipToCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["jump"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("skipto")
        .setDescription("Jump to a song in the queue, skipping the ones before it")
        .addIntegerOption((o) => o.setName("position").setDescription("Its number in /queue").setMinValue(1).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const { player } = ready;

        const position = ctx.options.getInteger("position", true);
        const target = player.queue.tracks[position - 1];
        if (!target) return ctx.reply({ content: `There are only ${player.queue.tracks.length} songs in the queue.`, ephemeral: true });

        await player.skip(position);
        return ctx.reply({ content: `⏭️ Jumped to ${trackLink(target)}.`, allowedMentions: { parse: [] } });
    }
}
