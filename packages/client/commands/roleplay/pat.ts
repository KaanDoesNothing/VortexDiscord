import {Command} from '@sapphire/framework';
import {GuildMember, SlashCommandBuilder} from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

export class PatCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("pat")
        .setDescription("Kiss")
        .addUserOption(option => option.setName("member").setDescription("member").setRequired(true));

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const member = interaction.options.getMember("member") as GuildMember || interaction.member;

        return interaction.reply(await this.roleplayEmbed("pat", `${interaction.user.username} patted ${member.user.username}`));
    }
}