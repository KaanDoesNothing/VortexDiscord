import {Command} from '@sapphire/framework';
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from '../../lib/structures/command';
import { DBManager } from '../../lib/database';

export class BioCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("bio")
        .setDescription("Change your bio")
        .addStringOption((option) => option.setName("bio").setDescription("bio").setRequired(true));

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const bio = interaction.options.getString("bio")!;

        const userData = await DBManager.getUser(interaction.user.id);
        userData.profile!.description = bio;
        await userData.save();

        return interaction.reply({content: "Updated."});
    }
}