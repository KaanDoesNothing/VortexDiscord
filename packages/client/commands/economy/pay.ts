import { Command } from '@sapphire/framework';
import {GuildMember, SlashCommandBuilder} from "discord.js";
import { VortexCommand } from '../../lib/structures/command';
import { DBManager } from '../../lib/database';
import { CurrencyName } from '../../lib/constant';

export class PayCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("pay")
        .setDescription("Pay someone")
        .addUserOption(option => option.setName("member").setDescription("member").setRequired(true))
        .addNumberOption(option => option.setName("amount").setDescription("amount").setMinValue(1).setRequired(true));

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const member = interaction.options.getMember("member") as GuildMember;
        const amount = interaction.options.getNumber("amount")!;

        if(member.user.id === interaction.user.id) return interaction.reply({content: "Nice try."});

        const userData = await DBManager.getUser(interaction.user.id);
        const targetData = await DBManager.getUser(member.user.id);

        if(amount > userData.economy!.balance) return interaction.reply({content: "Insufficient balance"});
        userData.economy!.balance -= amount;
        targetData.economy!.balance += amount;

        await userData.save();
        await targetData.save();

        return interaction.reply({content: `You have given ${amount} ${CurrencyName} to ${member.user.username}.`});
    }
}