import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export default class HelpCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "help",
            description: "Gives you a list of commands"
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