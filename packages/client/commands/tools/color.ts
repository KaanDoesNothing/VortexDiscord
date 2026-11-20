import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { Canvas } from "canvas-constructor/cairo";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// Parses #rgb, #rrggbb, rgb(r, g, b) or "random" into [r, g, b].
function parseColor(input: string): [number, number, number] | null {
    const v = input.trim().toLowerCase();
    if (v === "random") return [0, 0, 0].map(() => Math.floor(Math.random() * 256)) as [number, number, number];

    const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)?.[1];
    if (hex) {
        const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
        return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
    }

    const rgb = /^rgb\(?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/.exec(v);
    if (rgb) {
        const parts = rgb.slice(1).map(Number);
        return parts.every((n) => n <= 255) ? parts as [number, number, number] : null;
    }
    return null;
}

function toHsl([r, g, b]: [number, number, number]) {
    const [rn, gn, bn] = [r / 255, g / 255, b / 255];
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, Math.round(l * 100)];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

// /color <color>: preview a color with its HEX, RGB and HSL values. Accepts "random".
export class ColorCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["colour", "hex"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("color")
        .setDescription("Preview a color and get its HEX, RGB and HSL values")
        .addStringOption((o) => o.setName("color").setDescription("#ff8800, rgb(255,136,0) or random").setMaxLength(30).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const rgb = parseColor(ctx.options.getString("color", true));
        if (!rgb) return ctx.reply({ content: "Use a hex code like `#ff8800`, `rgb(255, 136, 0)` or `random`.", flags: MessageFlags.Ephemeral });

        const hex = `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
        const [h, s, l] = toHsl(rgb);
        const swatch = await new Canvas(256, 256).setColor(hex).printRectangle(0, 0, 256, 256).pngAsync();

        const embed = new VortexEmbed()
            .setTitle(hex.toUpperCase())
            .setColor(parseInt(hex.slice(1), 16))
            .setThumbnail("attachment://color.png")
            .addField("HEX", `\`${hex}\``, true)
            .addField("RGB", `\`rgb(${rgb.join(", ")})\``, true)
            .addField("HSL", `\`hsl(${h}, ${s}%, ${l}%)\``, true)
            .addField("Decimal", `\`${parseInt(hex.slice(1), 16)}\``, true);

        return ctx.reply({ embeds: [embed], files: [{ name: "color.png", attachment: swatch }] });
    }
}
