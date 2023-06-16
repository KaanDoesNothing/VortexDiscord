import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {UserTable} from "../../lib/Database";
import {VortexEmbed} from "../../lib/structures/Embed";
import {CurrencyName} from "../../lib/Language";
import {economyCategoryName} from "./mod";

export class LeaderboardCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Leaderboard")

    category = economyCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        // const choice = ctx.option("type") as string || "global";

        const topList = await UserTable.find({}).sort({"economy.money.value": "desc"}).limit(10);

        const embed = new VortexEmbed()
            .setTitle("Leaderboard");

        let description = "\n";

        for (const i in topList) {
            const row = topList[i];
            const user = await this.client.users.cache.get(row.user_id) || await this.client.users.fetch(row.user_id);

            if(!user) {
                console.log(`Unable to fetch user ${row.user_id}`);
                continue;
            }

            description += `${user.tag}: ${row.economy.money.value} ${CurrencyName}\n`;
        }

        embed.setDescription(description);

        await ctx.reply({embeds: [embed]});
    }
}