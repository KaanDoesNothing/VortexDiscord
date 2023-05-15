import {ApplicationCommandChoice, ApplicationCommandInteraction, ApplicationCommandOptionType} from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export default class HelpCommand extends VortexCommand {
    initialize(): void {
        // const choices: ApplicationCommandChoice = [];
        //
        // const commands = this.client.executables.commands;
        //
        // for (const i in commands) {
        //     const command = commands[i];
        //
        //     choices.push({
        //         name: command.name,
        //         value: command.name
        //     });
        // }

        this.config = {
            name: "help",
            description: "Gives you a list of commands",
            options: [
                {
                    name: "command",
                    required: false,
                    description: "Command",
                    type: ApplicationCommandOptionType.STRING,
                    // choices
                    // choices: this.client.executables.commands.
                }
            ]
        }
    }

    exec(ctx: ApplicationCommandInteraction): void {
        const categories: string[] = [];

		const embed = new VortexEmbed();

        embed.setTitle("This is a rewrite not the final version!");
		
		this.client.executables.commands.forEach((cmd) => {
			if(categories.includes(cmd.information.category)) return;

			categories.push(cmd.information.category);
		});

		categories.forEach((category) => {
            let commandsLine = "";
            this.client.executables.commands.forEach(cmd => {
                if(cmd.information.category !== category) return;
                commandsLine += (`\`${cmd.instance.config.name}\` `);
            });

			if(commandsLine.length < 1) return;

            embed.addField(category, commandsLine);
        });
		
		ctx.reply({embeds: [embed]});
	}
}