import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";

// /shuffle: shuffle the upcoming songs. DJ only (see the Music settings).
export class ShuffleCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: [] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("shuffle")
        .setDescription("Shuffle the upcoming songs");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const { player } = ready;

        return ctx.reply({ content: await Music.shuffle(player) });
    }
}
