import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexRolePlayEmbed } from "../../lib/Embed.ts";
import { nekosLife } from "../../lib/nekosLife.ts";

export default class PatCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "pat",
            description: "Pat someone",
            options: [
                {
                    name: "user",
                    required: true,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                }
            ]
        }
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user");

        const url = (await nekosLife.pat()).url;

        const embed = VortexRolePlayEmbed(ctx.user.username, user.username, "pat", url)

        ctx.reply({embeds: [embed]});
    }
}