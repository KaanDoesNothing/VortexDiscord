import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

// /hash <text> [algorithm]: hash text with MD5, SHA-1, SHA-256 or SHA-512.
export class HashCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("hash")
        .setDescription("Hash text with MD5, SHA-1, SHA-256 or SHA-512")
        .addStringOption((o) => o.setName("text").setDescription("Text to hash").setMaxLength(2000).setRequired(true))
        .addStringOption((o) => o.setName("algorithm").setDescription("Which hash (default SHA-256)").addChoices(
            { name: "MD5", value: "md5" }, { name: "SHA-1", value: "sha1" }, { name: "SHA-256", value: "sha256" }, { name: "SHA-512", value: "sha512" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const text = ctx.options.getString("text", true);
        const algorithm = (ctx.options.getString("algorithm") ?? "sha256") as "md5" | "sha1" | "sha256" | "sha512";

        const digest = new Bun.CryptoHasher(algorithm).update(text).digest("hex");
        return ctx.reply({ content: `**${algorithm.toUpperCase()}**\n\`\`\`\n${digest}\n\`\`\``, ephemeral: true });
    }
}
