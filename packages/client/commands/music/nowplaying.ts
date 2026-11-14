import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import type { Track } from "lavalink-client";
import { MusicCommand } from "../../lib/music/command";
import { nowPlayingMessage } from "../../lib/music/ui";

// /nowplaying: the current song with progress and control buttons.
export class NowPlayingCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["np", "current"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Show the current song with playback controls");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { sameChannel: false });
        if (!ready) return;
        const track = ready.player.queue.current;
        if (!track) return ctx.reply({ content: "Nothing is playing right now.", ephemeral: true });

        return ctx.reply(nowPlayingMessage(ready.player, track as Track));
    }
}
