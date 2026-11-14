import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";

// /skip: skip the current song. DJs, or whoever queued the current song.
export class SkipCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["s", "next"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current song");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: "requester" });
        if (!ready) return;
        const { player } = ready;

        return ctx.reply({ content: await Music.skip(player), allowedMentions: { parse: [] } });
    }
}
