import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /userinfo [user]: account details, plus server details if they're a member here.
export class UserinfoCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Account age, join date and roles for a user")
        .addUserOption((arg) => arg.setName("user").setDescription("Who to look up (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user") ?? ctx.user;
        const member = ctx.guild?.members.cache.get(user.id);

        const embed = new VortexEmbed()
            .setTitle(user.tag)
            .setThumbnail((member ?? user).displayAvatarURL({ size: 512 }))
            .addField("Mention", `${user}`, true)
            .addField("ID", user.id, true)
            .addField("Bot", user.bot ? "Yes" : "No", true)
            .addField("Account created", time(user.createdAt, "R"), true);

        if (member) {
            if (member.joinedAt) embed.addField("Joined server", time(member.joinedAt, "R"), true);

            // Highest roles first, without @everyone, kept under the field limit (1024).
            const roles = member.roles.cache.filter((r) => r.id !== ctx.guild!.id).sort((a, b) => b.position - a.position);
            let list = roles.map((r) => `${r}`).join(" ");
            if (list.length > 1000) list = `${list.slice(0, 1000).replace(/\s\S*$/, "")} …`;
            embed.addField(`Roles (${roles.size})`, list || "None");
        }

        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
