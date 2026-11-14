import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

// /base64 encode|decode <text>
export class Base64Command extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("base64")
        .setDescription("Encode or decode Base64 text")
        .addSubcommand((s) => s.setName("encode").setDescription("Text → Base64")
            .addStringOption((o) => o.setName("text").setDescription("Text to encode").setMaxLength(1500).setRequired(true)))
        .addSubcommand((s) => s.setName("decode").setDescription("Base64 → text")
            .addStringOption((o) => o.setName("text").setDescription("Base64 to decode").setMaxLength(1900).setRequired(true)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const text = ctx.options.getString("text", true);

        if (ctx.options.getSubcommand() === "encode") {
            return ctx.reply({ content: `\`\`\`\n${Buffer.from(text, "utf8").toString("base64")}\n\`\`\``, ephemeral: true });
        }

        const clean = text.trim().replace(/\s/g, "");
        if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(clean)) return ctx.reply({ content: "That isn't valid Base64.", ephemeral: true });

        const decoded = Buffer.from(clean, "base64").toString("utf8");
        return ctx.reply({ content: `\`\`\`\n${decoded.replace(/```/g, "ˋˋˋ").slice(0, 1900) || "(empty)"}\n\`\`\``, ephemeral: true });
    }
}
