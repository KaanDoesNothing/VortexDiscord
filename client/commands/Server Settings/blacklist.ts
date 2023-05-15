import { ApplicationCommandInteraction, ApplicationCommandOptionType } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { GuildTable } from "../../lib/Database.ts";

export class BlacklistCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "blacklist",
            description: "Blacklist words from your server",
            options: [
                {
                    name: "choice",
                    required: true,
                    choices: [
                        {
                            name: "Add",
                            value: "add"
                        },
                        {
                            name: "Remove",
                            value: "remove",
                        }
                    ],
                    description: "Add or Remove a word from the blacklist",
                    type: ApplicationCommandOptionType.STRING
                },
                {
                    name: "word",
                    required: true,
                    description: "Word",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "Server Settings";

        this.userPermissions.push("MANAGE_MESSAGES");
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const choice = (ctx.option("choice") as string);
        const word = (ctx.option("word") as string).toLowerCase();

        const guildData = await GuildTable.findOne({guild_id: ctx.guild.id});
        if(!guildData) return;

        if(choice === "add") {
            guildData.settings.blacklist.words.push(word);
        }else if(choice === "remove") {
            guildData.settings.blacklist.words = guildData.settings.blacklist.words.filter(word => word.toLowerCase() !== word);
        }

        await guildData.save();

        ctx.reply("Settings have been updated!");
	}
}