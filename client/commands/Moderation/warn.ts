import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { GuildWarnTable } from "../../lib/Database.ts";

export class WarnCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "warn",
            description: "Warn",
            options: [
                {
                    name: "user",
                    required: true,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                },
                {
                    name: "reason",
                    required: false,
                    description: "Reason",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "Moderation";

        this.userPermissions.push("MANAGE_MEMBERS");
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user");
        const reason = ctx.option("reason") as string || "None";
        (await GuildWarnTable.create({guild_id: ctx.guild?.id, user_id: user.id, reason})).save();

        ctx.reply(`${user.tag} has been warned.`);
    }
}