import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {VortexEmbed} from "../../lib/structures/Embed";
import {informationCategoryName} from "./mod";

export class ServerInfoCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Server Information");

    category = informationCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const guild = ctx.guild;
        if(!guild) return;

        const owner = this.client.users.cache.get(guild.ownerId) || await this.client.users.fetch(guild.ownerId);

        const embed = new VortexEmbed()
            .setThumbnail(guild.iconURL() as string)
            .addField("Name", guild.name as string, true)
            .addField("ID", guild.id, true)
            .addField("Owner", owner.username, true)
            .addField("Owner ID", owner.id, true)
            .addField("Channels", guild.channels.cache.size.toString(), true)
            .addField("Members", guild.memberCount.toString(), true)
            .addField("Roles", guild.roles.cache.size.toString(), true);

        return {embeds: [embed]};
    }
}