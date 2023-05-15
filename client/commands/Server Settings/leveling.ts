import { ApplicationCommandInteraction, ApplicationCommandOptionType } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { GuildTable } from "../../lib/Database.ts";

export class LevelingCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "leveling",
            description: "Enable or Disable the level system",
            options: [
                {
                    name: "choice",
                    required: true,
                    choices: [
                        {
                            name: "Enabled",
                            value: "enabled"
                        },
                        {
                            name: "Disabled",
                            value: "disabled",
                        }
                    ],
                    description: "Enable or Disable",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "Server Settings";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const enabled = (ctx.option("choice") as string) === "enabled";

        const guildData = await GuildTable.findOne({guild_id: ctx.guild.id});
        if(!guildData) return;

        guildData.set("settings.economy.experience.enabled", enabled);
        await guildData.save();

        ctx.reply("Settings have been updated!");
	}
}