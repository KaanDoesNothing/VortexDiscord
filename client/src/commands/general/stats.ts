import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder, User} from "discord.js";
import {VortexEmbed} from "../../lib/structures/Embed";
import os from "os";
import {generalCategoryName} from "./mod";

export class StatsCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Bot stats");

    category = generalCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const application = await this.client.application.fetch();
        const owner = application.owner as User;

        const embed = new VortexEmbed()
            .addField("Owner", owner.tag, true)
            .addField("Library", "Discord.js", true)
            .addField("Commands", this.client.executables.commands.size.toString(), true)
            .addField("Commands Ran", this.client.statistics.commands.ran.toString(), true)
            .addField("Messages Read", this.client.statistics.messages.read.toString(), true)
            .addField("Shards", this.client.ws.shards.size.toString(), true)
            .addField("Guilds", this.client.guilds.cache.size.toString(), true)
            .addField("Channels", this.client.channels.cache.size.toString(), true)
            .addField("Users", this.client.guilds.cache.reduce((prev, next) => prev + next.memberCount, 0).toString(), true)
            .addField("OS", os.platform(), true);

        await ctx.reply({embeds: [embed]})
    }
}