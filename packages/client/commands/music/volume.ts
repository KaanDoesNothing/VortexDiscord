import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import * as Music from "../../lib/music/actions";
import { MusicCommand } from "../../lib/music/command";

// /volume [level]: shows or sets the volume (capped by the server's max volume).
export class VolumeCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["vol"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Show or change the music volume")
        .addIntegerOption((o) => o.setName("level").setDescription("0-200 (the server may set a lower maximum)").setMinValue(0).setMaxValue(200));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const level = ctx.options.getInteger("level");
        const ready = await this.prepare(ctx, { dj: level !== null, sameChannel: level !== null });
        if (!ready) return;

        if (level === null) return ctx.reply({ content: `🔊 The volume is **${ready.player.volume}%** (max ${ready.settings.maxVolume}%).` });
        return ctx.reply({ content: await Music.setVolume(ready.player, level) });
    }
}
