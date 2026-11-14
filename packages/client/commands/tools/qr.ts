import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /qr <text>: turns text or a link into a QR code image (goqr.me API).
export class QrCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["qrcode"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("qr")
        .setDescription("Turn a link or text into a QR code")
        .addStringOption((o) => o.setName("text").setDescription("Link or text to encode").setMaxLength(900).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const text = ctx.options.getString("text", true);
        await ctx.deferReply();

        const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&margin=12&data=${encodeURIComponent(text)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
        if (!res?.ok) return ctx.editReply("Couldn't generate a QR code right now.");

        const image = Buffer.from(await res.arrayBuffer());
        const embed = new VortexEmbed().setTitle("QR code").setDescription(text.length > 200 ? `${text.slice(0, 200)}…` : text).setImage("attachment://qr.png");
        return ctx.editReply({ embeds: [embed], files: [{ name: "qr.png", attachment: image }] });
    }
}
