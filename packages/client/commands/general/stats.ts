import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, Team, time, version as djsVersion } from "discord.js";
import os from "node:os";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /stats: bot-wide numbers.
export class StatsCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Bot statistics: servers, users, memory, uptime and more");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const { client } = this.container;
        const application = await client.application!.fetch();

        // The app can be owned by a user or a team.
        const owner = application.owner instanceof Team
            ? `${application.owner.name} (team)`
            : application.owner ? `@${application.owner.username}` : "Unknown";

        const memoryMb = process.memoryUsage().rss / 1024 / 1024;
        const users = client.guilds.cache.reduce((sum, guild) => sum + guild.memberCount, 0);

        const embed = new VortexEmbed()
            .setTitle(`${client.user!.username} stats`)
            .setThumbnail(client.user!.displayAvatarURL())
            .addField("Owner", owner, true)
            .addField("Servers", client.guilds.cache.size.toLocaleString(), true)
            .addField("Users", users.toLocaleString(), true)
            .addField("Channels", client.channels.cache.size.toLocaleString(), true)
            .addField("Commands", this.container.stores.get("commands").size.toString(), true)
            .addField("Shards", client.ws.shards.size.toString(), true)
            .addField("Memory", `${memoryMb.toFixed(0)} MB`, true)
            .addField("Runtime", `Bun ${Bun.version} · discord.js ${djsVersion}`, true)
            .addField("OS", `${os.platform()} ${os.arch()}`, true)
            .addField("Online since", time(new Date(Date.now() - (client.uptime ?? 0)), "R"), true);

        return ctx.reply({ embeds: [embed] });
    }
}
