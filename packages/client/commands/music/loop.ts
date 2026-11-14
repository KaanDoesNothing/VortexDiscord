import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import type { RepeatMode } from "lavalink-client";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";

// /loop [mode]: loop the song, the whole queue, or turn looping off. Without a mode it cycles.
export class LoopCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["repeat"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Loop the current song or the whole queue")
        .addStringOption((o) => o.setName("mode").setDescription("What to loop (cycles if left out)").addChoices(
            { name: "Song", value: "track" }, { name: "Queue", value: "queue" }, { name: "Off", value: "off" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const mode = ctx.options.getString("mode") as RepeatMode | null;
        return ctx.reply({ content: await Music.setLoop(ready.player, mode ?? undefined) });
    }
}
