import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { EmojiDislike, EmojiLike } from "../../lib/constant";
import { DBManager, Engagement } from "../../lib/database";
import { economyFor } from "../../lib/economy";
import { levelFromXp } from "../../lib/leveling";
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
        if (user.bot) return ctx.reply({ content: "Bots don't have profiles.", flags: MessageFlags.Ephemeral });

        const eco = await economyFor(ctx.guildId);
        const [userData, wallet, memberData, birthday, config] = await Promise.all([
            DBManager.getUser(user.id),
            eco.wallet(user.id),
            ctx.guildId ? DBManager.getGuildMember(ctx.guildId, user.id) : null,
            Engagement.getBirthday(user.id),
            ctx.guildId ? DBManager.getGuildConfig(ctx.guildId) : null
        ]);
        const level = memberData ? levelFromXp(memberData.xp, config?.settings.leveling.difficulty) : null;

        const embed = new VortexEmbed()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ size: 512 }))
            .addField("Wallet", eco.format(wallet.balance), true)
            .addField("Bank", eco.format(wallet.bank), true)
            .addField("Server level", memberData && level ? `${level} (${memberData.xp.toLocaleString("en-US")} XP)` : "—", true)
            .addField(`${EmojiLike} Likes`, userData.likes.toLocaleString(), true)
            .addField(`${EmojiDislike} Dislikes`, userData.dislikes.toLocaleString(), true)
            .addField("🎂 Birthday", birthday ? `${MONTHS[birthday.month - 1]} ${birthday.day}` : "Not set (`/birthday set`)", true)
            .setFooter({ text: `Bio: ${userData.bio}` });

        if (wallet.dailyStreak > 1) embed.addField("🔥 Daily streak", `${wallet.dailyStreak} days`, true);

        return ctx.reply({ embeds: [embed] });
    }
}
