import { Command } from '@sapphire/framework';
import {SlashCommandBuilder} from "discord.js";
import { VortexCommand } from '../../lib/structures/command';
import { DBManager } from '../../lib/database';
import { CurrencyName } from '../../lib/constant';

export class diceCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("dice")
        .setDescription("Rolls a dice with your specified bet")
        .addNumberOption(option => option.setName("roll")
            .setDescription("1-6")
            .setMinValue(1)
            .setMaxValue(6)
            .setRequired(true))
        .addNumberOption(option => option.setName("amount")
            .setDescription("Amount of coins")
            .setMinValue(1)
            .setRequired(true));

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const roll = interaction.options.getNumber("roll")!;
        const amount = interaction.options.getNumber("amount")!;

        const userData = await DBManager.getUser(interaction.user.id);

        if (amount > userData.economy!.balance) return interaction.reply({content: `You don't have enough ${CurrencyName}.`});

        const generatedNumber = Math.floor((Math.random() * 6) + 1);

        const won = roll === generatedNumber;
        const newBalance = won ? userData.economy!.balance + (amount * 6) : userData.economy!.balance - amount;
        const msgContent = won ? `:white_check_mark: You Won, ${amount * 6} ${CurrencyName} have been added to your bank account.` : `:x: You lost, ${amount} ${CurrencyName} have been taken from your bank account.`;

        userData.economy!.balance = newBalance;
        await userData.save();

        return interaction.reply({content: msgContent});
    }
}