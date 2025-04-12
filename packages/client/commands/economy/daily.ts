import {Command, container} from '@sapphire/framework';
import moment from "moment";
import {SlashCommandBuilder} from "discord.js";
import { VortexCommand } from '../../lib/structures/command';
import { DBManager } from '../../lib/database';
import { CurrencyName, EconomyDailyReward, EconomyDailyTimeout } from '../../lib/constant';

export class DailyCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Collect your daily");

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const userData = await DBManager.getUser(interaction.user.id);

        const readyToCollect = (Date.now() - new Date(userData.timeouts!.daily || 0).getTime() > EconomyDailyTimeout);

        const newTime = new Date(userData.timeouts!.daily!).getTime() + EconomyDailyTimeout;

        if(!readyToCollect) return interaction.reply({content: `:x: You can claim your daily again ${moment(newTime).fromNow()}.`});

        userData.economy!.balance+= EconomyDailyReward;
        userData.timeouts!.daily = new Date();

        await userData.save();

        return interaction.reply({content: `:white_check_mark: Claimed your daily ${EconomyDailyReward} ${CurrencyName}.`});
    }
}