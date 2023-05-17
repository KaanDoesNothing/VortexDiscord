import {ApplicationCommandInteraction, ApplicationCommandOptionType} from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export class HelpCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "help",
            description: "Gives you a list of commands",
            options: [
                {
                    name: "command",
                    required: false,
                    description: "Command",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "General";
    }

    exec(ctx: ApplicationCommandInteraction): void {
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

            embed.addField(category, commandsLine);
        });
		
		ctx.reply({embeds: [embed]});
	}
}