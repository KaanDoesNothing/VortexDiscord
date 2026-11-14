import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import type { Player } from "lavalink-client";
import { MusicCommand } from "../../lib/music/command";

// Audio effects. Each preset resets the others first, so they don't pile up.
const PRESETS: Record<string, { label: string; apply: (p: Player) => Promise<unknown> }> = {
    off: { label: "No effects", apply: async () => undefined },
    bassboost: { label: "Bass boost", apply: (p) => p.filterManager.setEQPreset("BassboostMedium") },
    bassboost_hard: { label: "Bass boost (hard)", apply: (p) => p.filterManager.setEQPreset("BassboostHigh") },
    nightcore: { label: "Nightcore", apply: (p) => p.filterManager.toggleNightcore() },
    vaporwave: { label: "Vaporwave", apply: (p) => p.filterManager.toggleVaporwave() },
    eightd: { label: "8D audio", apply: (p) => p.filterManager.toggleRotation(0.2) },
    karaoke: { label: "Karaoke (remove vocals)", apply: (p) => p.filterManager.toggleKaraoke() },
    lowpass: { label: "Muffled (low pass)", apply: (p) => p.filterManager.toggleLowPass() },
    tremolo: { label: "Tremolo", apply: (p) => p.filterManager.toggleTremolo() },
    vibrato: { label: "Vibrato", apply: (p) => p.filterManager.toggleVibrato() },
    pop: { label: "Pop EQ", apply: (p) => p.filterManager.setEQPreset("Pop") },
    rock: { label: "Rock EQ", apply: (p) => p.filterManager.setEQPreset("Rock") },
    electronic: { label: "Electronic EQ", apply: (p) => p.filterManager.setEQPreset("Electronic") },
    gaming: { label: "Gaming EQ", apply: (p) => p.filterManager.setEQPreset("Gaming") }
};

// /filter <effect> [speed]: audio effects like bass boost, nightcore and 8D. "No effects" resets everything.
export class FilterCommand extends MusicCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["filters", "effect", "bassboost"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("filter")
        .setDescription("Add an audio effect: bass boost, nightcore, 8D, karaoke and more")
        .addStringOption((o) => o.setName("effect").setDescription("Which effect").setRequired(true)
            .addChoices(...Object.entries(PRESETS).map(([value, p]) => ({ name: p.label, value }))))
        .addNumberOption((o) => o.setName("speed").setDescription("Playback speed, 0.5-2 (optional)").setMinValue(0.5).setMaxValue(2));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const ready = await this.prepare(ctx, { dj: true });
        if (!ready) return;
        const { player } = ready;

        const key = ctx.options.getString("effect", true);
        const preset = PRESETS[key];
        if (!preset) return ctx.reply({ content: "Unknown effect.", ephemeral: true });
        const speed = ctx.options.getNumber("speed");

        await ctx.deferReply();
        await player.filterManager.resetFilters();
        await preset.apply(player);
        if (speed) await player.filterManager.setSpeed(speed);

        return ctx.editReply(key === "off" && !speed ? "🎛️ Effects cleared." : `🎛️ Effect: **${preset.label}**${speed ? ` · speed ${speed}x` : ""}. It can take a few seconds to kick in.`);
    }
}
