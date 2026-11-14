import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";

// /previous: go back and play the previous song again. DJ only (see the Music settings).
export class PreviousCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["prev", "back"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("previous")
        .setDescription("Go back and play the previous song again");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const { player } = ready;

        return ctx.reply({ content: await Music.previous(player), allowedMentions: { parse: [] } });
    }
}
