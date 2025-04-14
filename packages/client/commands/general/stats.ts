import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, User } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";
import os from "node:os";
import { Database } from "../../lib/database";

export class StatsCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Bot stats")

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const application = await this.container.client.application!.fetch();
        const owner = application.owner as User;

        const commandsRan = await Database.CommandLog.find().countDocuments();

        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        const embed = new VortexEmbed()
            .addField("Owner", `@${owner.username}`, true)
            .addField("Library", "Discord.js", true)
            // .addField("Commands", this.container.client.stores.get("commands").size.toString(), true)
            .addField("Commands Ran", commandsRan.toString(), true)
            // .addField("Messages Read", this.container.client.statistics.messages.read.toString(), true)
            .addField("Shards", this.container.client.ws.shards.size.toString(), true)
            .addField("Guilds", this.container.client.guilds.cache.size.toString(), true)
            .addField("Channels", this.container.client.channels.cache.size.toString(), true)
            .addField("Users", this.container.client.guilds.cache.reduce((prev, next) => prev + next.memberCount, 0).toString(), true)
            .addField("Memory", `${(Math.round(usedMemory * 100) / 100).toFixed(0)} MB`, true)
            .addField("OS", os.platform(), true);

        return ctx.reply({embeds: [embed]});
    }
}