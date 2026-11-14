import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { EmojiDislike, EmojiLike } from "../../lib/constant";
import { DBManager, Engagement } from "../../lib/database";
import { getCurrency } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// /profile [member]: coins, server level, likes/dislikes, birthday and bio.
export class ProfileCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("profile")
        .setDescription("View a profile card: coins, level, likes, birthday and bio")
        .addUserOption((option) => option.setName("member").setDescription("Whose profile to view (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("member") ?? ctx.user;
        if (user.bot) return ctx.reply({ content: "Bots don't have profiles.", ephemeral: true });

        const [userData, memberData, birthday, currency] = await Promise.all([
            DBManager.getUser(user.id),
            ctx.guildId ? DBManager.getGuildMember(ctx.guildId, user.id) : null,
            Engagement.getBirthday(user.id),
            getCurrency(ctx.guildId)
        ]);

        const embed = new VortexEmbed()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ size: 512 }))
            .addField("Wallet", currency.format(userData.balance), true)
            .addField("Bank", currency.format(userData.bank), true)
            .addField("Server level", memberData ? `${memberData.level} (${memberData.messages.toLocaleString()} messages)` : "—", true)
            .addField(`${EmojiLike} Likes`, userData.likes.toLocaleString(), true)
            .addField(`${EmojiDislike} Dislikes`, userData.dislikes.toLocaleString(), true)
            .addField("🎂 Birthday", birthday ? `${MONTHS[birthday.month - 1]} ${birthday.day}` : "Not set (`/birthday set`)", true)
            .setFooter({ text: `Bio: ${userData.bio}` });

        if (userData.dailyStreak > 1) embed.addField("🔥 Daily streak", `${userData.dailyStreak} days`, true);

        return ctx.reply({ embeds: [embed] });
    }
}
