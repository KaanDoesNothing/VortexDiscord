import {Command} from '@sapphire/framework';
import {GuildMember, SlashCommandBuilder} from "discord.js";
import { VortexCommand } from '../../lib/structures/command';
import { DBManager } from '../../lib/database';
import { CurrencyName } from '../../lib/constant';

export class BalanceCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            aliases: ["bal"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Account balance")
        .addUserOption(option => option.setName("member").setDescription("member"));

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("member") as GuildMember || ctx.member;

        const userData = await DBManager.getUser(member.user.id);

        return ctx.reply({content: member.user.id === ctx.user.id ? `You have ${userData.economy?.balance} ${CurrencyName}.` : `${member.user.username} has ${userData.economy?.balance} ${CurrencyName}.`});
    }
}