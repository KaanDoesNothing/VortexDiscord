import { ApplicationCommandInteraction, ApplicationCommandOptionType } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { GuildTable } from "../../lib/Database.ts";

export class PrefixCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "prefix",
            description: "Change the server prefix",
            options: [
                {
                    name: "prefix",
                    required: true,
                    description: "Add or Remove a word from the blacklist",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "Server Settings";

        this.userPermissions.push("MANAGE_GUILD");
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const prefix = (ctx.option("prefix") as string);

        const guildData = await GuildTable.findOne({guild_id: ctx.guild.id});
        if(!guildData) return;

        guildData.set("settings.prefix", prefix);

        await guildData.save();

        ctx.reply("Settings have been updated!");
	}
}