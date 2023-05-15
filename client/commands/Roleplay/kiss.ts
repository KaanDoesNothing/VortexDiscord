import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexRolePlayEmbed } from "../../lib/Embed.ts";
import { nekosLife } from "../../lib/nekosLife.ts";

export class KissCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "kiss",
            description: "Kiss someone",
            options: [
                {
                    name: "user",
                    required: true,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                }
            ]
        }

        this.category = "Roleplay";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user");

        const url = (await nekosLife.hug()).url;

        const embed = VortexRolePlayEmbed(ctx.user.username, user.username, "kissed", url)

        ctx.reply({embeds: [embed]});
    }
}