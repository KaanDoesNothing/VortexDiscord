import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

export class ExampleCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {

    }
}