import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { VortexCommand } from "../../lib/structures/command";

// /bio <text>: sets the bio shown at the bottom of your /profile.
export class BioCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("bio")
        .setDescription("Set the bio shown on your profile")
        .addStringOption((option) => option.setName("bio").setDescription("Up to 100 characters about you").setMaxLength(100).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const bio = ctx.options.getString("bio", true).trim();
        if (!bio) return ctx.reply({ content: "Your bio can't be empty.", ephemeral: true });

        await DBManager.setBio(ctx.user.id, bio);

        return ctx.reply({ content: "Your bio has been updated.", ephemeral: true });
    }
}
