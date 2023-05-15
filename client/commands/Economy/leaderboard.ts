import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { UserTable } from "../../lib/Database.ts";
import { CurrencyName } from "../../lib/Language.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export class LeaderboardCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "leaderboard",
            description: "Leaderboard",
            // options: [
            //     {
            //         name: "type",
            //         required: false,
            //         choices: [
            //             {
            //                 name: "Global",
            //                 value: "global"
            //             },
            //             {
            //                 name: "Server",
            //                 value: "server",
            //             }
            //         ],
            //         description: "Global or Server",
            //         type: ApplicationCommandOptionType.STRING
            //     }
            // ]
        }

        this.category = "Economy";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        // const choice = ctx.option("type") as string || "global";

        const topList = await UserTable.find({}).sort({"economy.money.value": "desc"}).limit(10);

        const embed = new VortexEmbed()
            .setTitle("Leaderboard");

        let description = "\n";

        for (const i in topList) {
            const row = topList[i];
            const user = await this.client.users.get(row.user_id) || await this.client.users.fetch(row.user_id);

            if(!user) {
                console.log(`Unable to fetch user ${row.user_id}`);
                continue;
            }

            description += `${user.tag}: ${row.economy.money.value} ${CurrencyName}\n`;
        }

        embed.setDescription(description);

        ctx.reply({embeds: [embed]});
    }
}