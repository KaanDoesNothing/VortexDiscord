import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";

// /pause: pause the music. DJ only (see the Music settings).
export class PauseCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: [] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("pause")
        .setDescription("Pause the music");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const { player } = ready;

        if (player.paused) return ctx.reply({ content: "Already paused. Use `/resume`.", flags: MessageFlags.Ephemeral });
        return ctx.reply({ content: await Music.togglePause(player) });
    }
}
