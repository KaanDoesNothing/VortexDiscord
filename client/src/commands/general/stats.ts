import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder, User} from "discord.js";
import {VortexEmbed} from "../../lib/structures/Embed";
import os from "os";
import {generalCategoryName} from "./mod";

export class StatsCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Bot stats");

    category = generalCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const application = await this.client.application.fetch();
        const owner = application.owner as User;

        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        const embed = new VortexEmbed()
            .addField("Owner", `@${owner.username}`, true)
            .addField("Library", "Discord.js", true)
            .addField("Commands", this.client.executables.commands.size.toString(), true)
            .addField("Commands Ran", this.client.statistics.commands.ran.toString(), true)
            .addField("Messages Read", this.client.statistics.messages.read.toString(), true)
            .addField("Shards", this.client.ws.shards.size.toString(), true)
            .addField("Guilds", this.client.guilds.cache.size.toString(), true)
            .addField("Channels", this.client.channels.cache.size.toString(), true)
            .addField("Users", this.client.guilds.cache.reduce((prev, next) => prev + next.memberCount, 0).toString(), true)
            .addField("Memory", `${(Math.round(usedMemory * 100) / 100).toFixed(0)} MB`, true)
            .addField("OS", os.platform(), true);

        return {embeds: [embed]};
    }
}