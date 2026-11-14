import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";

// /stop: stop the music, clear the queue and leave voice. DJ only (see the Music settings).
export class StopCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["leave", "disconnect", "dc"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the music, clear the queue and leave voice");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const { player } = ready;

        return ctx.reply({ content: await Music.stop(player) });
    }
}
