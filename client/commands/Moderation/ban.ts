import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";

export default class BanCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "ban",
            description: "Ban",
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

        this.clientPermissions.push("BAN_MEMBERS");
        this.userPermissions.push("BAN_MEMBERS");
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user");
        const reason = ctx.option("reason") as string || "None";
        
        const member = await ctx.guild?.members.get(user.id);
        if(!member) return;

        if(!member.bannable) {
            ctx.reply(`You can't ban the following user: ${user.tag}.`);
            return;
        }

        await member.ban(reason);

        ctx.reply(`${user.tag} has been banned.`);
    }
}