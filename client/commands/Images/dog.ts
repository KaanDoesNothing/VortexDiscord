import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";
import { getImage } from "npm:random-reddit";

export class DogCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "dog",
            description: "Picture of a dog",
        }

        this.category = "Images";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const img = await getImage("dogs", 5);

        if(!img) {
            ctx.reply("Error fetching image!");
            return;
        }

        const embed = new VortexEmbed()
            .setImage(img);

        ctx.reply({embeds: [embed]});
    }
}