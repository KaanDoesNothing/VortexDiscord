import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export class ServerInfoCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "serverinfo",
            description: "Server Information"
        }

        this.category = "Information";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const guild = ctx.guild;
        if(!guild) return;

        const owner = await this.client.users.fetch(guild.ownerID as string);

        const embed = new VortexEmbed()
            .setThumbnail(guild.iconURL("png") as string)
            .addField("Name", guild.name as string, true)
            .addField("ID", guild.id, true)
            .addField("Owner", owner.username, true)
            .addField("Owner ID", owner.id, true)
            .addField("Channels", (await guild.channels.size()).toString(), true)
            .addField("Members", guild.memberCount?.toString() as string, true)
            .addField("Roles", (await guild.roles.size()).toString(), true);

        ctx.reply({embeds: [embed]});
    }
}