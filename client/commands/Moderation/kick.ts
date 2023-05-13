import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";

export default class KickCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "kick",
            description: "Kick",
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

        this.clientPermissions.push("KICK_MEMBERS");
        this.userPermissions.push("KICK_MEMBERS");
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user");
        const reason = ctx.option("reason") as string || "None";
        
        const member = await ctx.guild?.members.get(user.id);
        if(!member) return;

        if(!member.kickable) {
            ctx.reply(`You can't kick the following user: ${user.tag}.`);
            return;
        }

        await member.kick(reason);

        ctx.reply(`${user.tag} has been kicked.`);
    }
}