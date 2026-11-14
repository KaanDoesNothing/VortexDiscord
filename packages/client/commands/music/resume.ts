import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";

// /resume: resume paused music. DJ only (see the Music settings).
export class ResumeCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["unpause"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Resume paused music");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const { player } = ready;

        if (!player.paused) return ctx.reply({ content: "The music isn't paused.", ephemeral: true });
        return ctx.reply({ content: await Music.togglePause(player) });
    }
}
