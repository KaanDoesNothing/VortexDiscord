import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /roles: the server's roles, highest first.
export class RolesCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("roles")
        .setDescription("List all of this server's roles, highest first");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const roles = guild.roles.cache.filter((r) => r.id !== guild.id).sort((a, b) => b.position - a.position);

        // Embed descriptions max out at 4096 characters; cut off cleanly if there are a lot of roles.
        let description = "";
        let shown = 0;
        for (const role of roles.values()) {
            const next = `${role} `;
            if (description.length + next.length > 4000) break;
            description += next;
            shown++;
        }
        if (shown < roles.size) description += `\n…and ${roles.size - shown} more`;

        const embed = new VortexEmbed()
            .setThumbnail(guild.iconURL())
            .setTitle(`Roles in ${guild.name}`)
            .setDescription(description || "No roles.")
            .setFooter({ text: `${roles.size} roles` });

        // Role mentions in an embed don't ping, but be explicit anyway.
        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
