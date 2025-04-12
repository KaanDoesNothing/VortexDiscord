import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";
import { capitalizeFirstLetter } from "@sapphire/utilities";

export class HelpCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows all available commands")
        .addStringOption(option => option.setName("command").setDescription("Show information about command").setRequired(false));

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const specifiedCommand = interaction.options.getString("command");
        if(specifiedCommand) {
            const command = this.container.client.stores.get("commands").find((cmd) => {
                const command = cmd as VortexCommand;
                if(command.applicationCommandData?.name === specifiedCommand.toLowerCase() || command.aliases.includes(specifiedCommand.toLowerCase())) return command;
                return;
            }) as VortexCommand | null;

            if(!command) return interaction.reply({content: "Command doesn't exist"});

            const embed = new VortexEmbed()
                .setTitle(`Help: ${command.applicationCommandData.name}`)
                .setDescription(`Usage: ${command.applicationCommandData.name} ${command.applicationCommandData.toJSON().options?.map(option => `[${option.name}] `).join(" ")}`)
                .addFields(
                    {name: "Name", value: command.applicationCommandData.name, inline: true},
                    {name: "Description", value: command.applicationCommandData.description, inline: true},
                    {name: "Category", value: capitalizeFirstLetter(command.category!) || "Unknown", inline: true}
                )
                .setFooter({text: `Aliases: ${command.aliases.length > 0 ? command.aliases.join(", ") : "None"}`})
                .setTimestamp()

            return interaction.reply({embeds: [embed]});
        }

        let categories: string[] = [];

        const embed = new VortexEmbed()
            .setTitle("Help")
            .setFooter({text: `${await this.container.client.fetchPrefix(interaction as any)}help [command_name] for more info`})
            .setTimestamp();

        //@ts-ignore
        this.container.stores.get("commands").sort((a, b) => b.permission_level > a.permission_level).map((cmd) => {
            if(categories.includes(cmd.category!)) return;

            categories.push(cmd.category!);
        });

        categories.forEach((category) => {
            let commandsLine = "";
            this.container.stores.get("commands").filter((cmd) => cmd.category === category).forEach(cmd => {
                commandsLine += (`\`${cmd.name}\` `);
            });

            if(commandsLine.length < 1) return;

            embed.addFields({name: capitalizeFirstLetter(category), value: commandsLine});
        });

        return interaction.reply({embeds: [embed]});
    }
}