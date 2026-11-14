import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { MusicCommand } from "../../lib/music/command";

// /autoplay: when the queue runs out, keep playing related songs (see autoplay() in lib/music/manager.ts).
export class AutoplayCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["ap"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("autoplay")
        .setDescription("Keep playing related songs when the queue runs out");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;

        const on = !ready.player.get<boolean>("autoplay");
        ready.player.set("autoplay", on);
        return ctx.reply({ content: on ? "♾️ Autoplay is **on**: I'll keep playing similar songs when the queue ends." : "Autoplay is **off**." });
    }
}
