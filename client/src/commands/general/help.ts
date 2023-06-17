import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {VortexEmbed} from "../../lib/structures/Embed";
import {generalCategoryName} from "./mod";

export class HelpCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("help")
        .setDescription(("Gives you a list of commands"));

    category = generalCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const categories: string[] = [];

        const embed = new VortexEmbed();

        embed.setTitle("This is a rewrite not the final version!");
        embed.setDescription("Experimental: You can also use commands with the prefix, Take a look at https://vortex.kaanlikescoding.me/commands?prefix=true");

        this.client.executables.commands.forEach((cmd) => {
            if(categories.includes(cmd.category)) return;

            categories.push(cmd.category);
        });

        categories.forEach((category) => {
            let commandsLine = "";
            this.client.executables.commands.forEach(cmd => {
                if(cmd.hidden) return;

                if(cmd.category !== category) return;
                commandsLine += (`\`${cmd.config.name}\` `);
            });

            if(commandsLine.length < 1) return;

            embed.addFields({name: category, value: commandsLine});
        });

        await ctx.reply({embeds: [embed]});
    }
}