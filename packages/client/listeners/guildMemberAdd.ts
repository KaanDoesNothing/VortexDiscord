import { Events, Listener } from "@sapphire/framework";
import { time, type GuildMember } from "discord.js";
import { DBManager, Dashboard } from "../lib/database";
import { sendLog } from "../lib/eventlog";
import { renderWelcomeCard } from "../lib/images";
import { renderTemplate } from "../lib/settings";
import { VortexEmbed } from "../lib/structures/embed";

// New member: auto-roles, welcome message (optionally with a card), the members log, and the growth chart.
// Needs the privileged Server Members intent (DISCORD_MEMBERS_INTENT=true), otherwise this never fires.
export class GuildMemberAddListener extends Listener<typeof Events.GuildMemberAdd> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.GuildMemberAdd });
    }

    public async run(member: GuildMember) {
        const { guild, user } = member;
        const { settings } = await DBManager.getGuildConfig(guild.id);

        // Growth chart data.
        await Dashboard.recordMemberEvent(guild.id, user.id, "join").catch(() => null);

        // Members log, with account age (very new accounts are a common raid signal).
        const ageDays = Math.floor((Date.now() - user.createdTimestamp) / 86_400_000);
        await sendLog(guild, "members", new VortexEmbed()
            .setColor(0x30a46c)
            .setTitle("Member joined")
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${member} (${user.tag})`)
            .addField("Account created", `${time(user.createdAt, "R")}${ageDays < 7 ? " ⚠️ new account" : ""}`, true)
            .addField("Member count", guild.memberCount.toLocaleString(), true)
            .setFooter({ text: `User ID: ${user.id}` }));

        // Only add roles the bot is actually allowed to give (below its highest role, not managed).
        if (settings.autoRoleIds.length && !user.bot) {
            const roles = settings.autoRoleIds
                .map((id) => guild.roles.cache.get(id))
                .filter((role) => role && role.editable && !role.managed);

            if (roles.length) await member.roles.add(roles.map((role) => role!.id), "Auto-role").catch(() => null);
        }

        const { welcome } = settings;
        if (!welcome.enabled || !welcome.channelId) return;

        const channel = await guild.channels.fetch(welcome.channelId).catch(() => null);
        if (!channel?.isSendable()) return;

        const content = renderTemplate(welcome.message, {
            user: { id: user.id, username: user.username, displayName: member.displayName },
            server: { name: guild.name, memberCount: guild.memberCount },
            channelId: channel.id
        });

        const files = welcome.image
            ? [{ name: "welcome.png", attachment: await renderWelcomeCard(user, guild.name, guild.memberCount).catch(() => null) }].filter((f) => f.attachment)
            : [];

        await channel.send({ content, files: files as { name: string; attachment: Buffer }[], allowedMentions: { users: [member.id] } }).catch(() => null);
    }
}
