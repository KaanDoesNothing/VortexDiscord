import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";
import os from "https://deno.land/x/dos@v0.11.0/mod.ts";

export class StatsCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "stats",
            description: "Bot stats"
        }

        this.category = "General";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const owner = await this.client.fetchApplication()

        const embed = new VortexEmbed()
            .addField("Owner", owner.owner.tag, true)
            .addField("Library", "Harmony", true)
            .addField("Commands", this.client.executables.commands.size.toString(), true)
            .addField("Commands Ran", this.client.statistics.commands.ran.toString(), true)
            .addField("Messages Read", this.client.statistics.messages.read.toString(), true)
            .addField("Shards", this.client.shards.list.size.toString(), true)
            .addField("Guilds", (await this.client.guilds.size()).toString(), true)
            .addField("Channels", (await this.client.channels.size()).toString(), true)
            .addField("Users", (await this.client.users.size()).toString(), true)
            .addField("OS", os.platform(), true);

        ctx.reply({embeds: [embed]})
    }
}