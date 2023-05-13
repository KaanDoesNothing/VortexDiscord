import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { GuildWarnTable } from "../../lib/Database.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export default class WarnsCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "warns",
            description: "Warns",
            options: [
                {
                    name: "user",
                    required: true,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                }
            ]
        }

        this.userPermissions.push("MANAGE_MEMBERS");
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user");

        const warnList = await GuildWarnTable.find({guild_id: ctx.guild?.id, user_id: user.id}).sort({"createdAt": "desc"}).limit(10);

        const embed = new VortexEmbed()
            .setTitle(`${user.tag}'s warnings`);

        for (const i in warnList) {
            const row = warnList[i];

            embed.addField(row.createdAt.toLocaleString(), row.reason);
        }

        ctx.reply({embeds: [embed]});
    }
}