import { Events, Listener } from "@sapphire/framework";
import { time, type GuildMember } from "discord.js";
import { screenNewMember } from "../lib/antiraid";
import { DBManager, Dashboard } from "../lib/database";
import { sendLog } from "../lib/eventlog";
import { renderWelcomeCard } from "../lib/images";
import { inviteStats, trackJoin } from "../lib/invites";
import { memberContext, renderMessage } from "../lib/messages";
import { Colors, VortexEmbed } from "../lib/structures/embed";

// New member: raid screening, invite tracking, auto-roles, welcome message (optionally with a card)
// and DM, the members/invites logs, and the growth chart.
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

        // Anti-raid may kick them straight away (lockdown, account too new).
        const removed = await screenNewMember(member).catch(() => false);

        // Which invite they used (needs Manage Server).
        const invite = await trackJoin(member).catch(() => ({ inviterId: null, code: null }));
        const inviter = invite.inviterId ? { id: invite.inviterId, invites: (await inviteStats(guild.id, invite.inviterId)).current } : null;

        // Members log, with account age (very new accounts are a common raid signal).
        const ageDays = Math.floor((Date.now() - user.createdTimestamp) / 86_400_000);
        const log = new VortexEmbed(guild.id)
            .setColor(removed ? Colors.danger : Colors.success)
            .setTitle(removed ? "Member joined (removed by anti-raid)" : "Member joined")
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${member} (${user.tag})`)
            .addField("Account created", `${time(user.createdAt, "R")}${ageDays < 7 ? " ⚠️ new account" : ""}`, true)
            .addField("Member count", guild.memberCount.toLocaleString("en-US"), true)
            .setFooter({ text: `User ID: ${user.id}` });
        if (invite.code) log.addField("Invite", `\`${invite.code}\`${inviter ? ` by <@${inviter.id}> (${inviter.invites} invites)` : ""}`, true);
        await sendLog(guild, "members", log);
        if (settings.logs.invites && settings.logs.invites !== settings.logs.members) {
            await sendLog(guild, "invites", new VortexEmbed(guild.id).setTitle("📨 Joined with an invite")
                .setDescription(`${member} joined${invite.code ? ` using \`${invite.code}\`` : ""}${inviter ? `, invited by <@${inviter.id}> (now ${inviter.invites} invites)` : " (inviter unknown)"}.`));
        }
        if (removed) return;

        // Only add roles the bot is actually allowed to give (below its highest role, not managed).
        if (settings.autoRoleIds.length && !user.bot) {
            const roles = settings.autoRoleIds
                .map((id) => guild.roles.cache.get(id))
                .filter((role) => role && role.editable && !role.managed);
            if (roles.length) await member.roles.add(roles.map((role) => role!.id), "Auto-role").catch(() => null);
        }

        const { welcome } = settings;
        if (!welcome.enabled || user.bot) return;
        const ctx = memberContext(member, { inviter });

        if (welcome.dm.enabled) await member.send(renderMessage(welcome.dm.message, ctx, guild.id)).catch(() => null);
        if (!welcome.channelId) return;

        const channel = guild.channels.cache.get(welcome.channelId) ?? await guild.channels.fetch(welcome.channelId).catch(() => null);
        if (!channel?.isSendable()) return;

        const payload = renderMessage(welcome.message, { ...ctx, channelId: channel.id }, guild.id);
        const card = welcome.image ? await renderWelcomeCard(user, guild.name, guild.memberCount).catch(() => null) : null;
        // The card goes inside the embed if there is one, otherwise below the text.
        if (card && payload.embeds[0] && !payload.embeds[0].data.image) payload.embeds[0].setImage("attachment://welcome.png");

        await channel.send({
            ...payload,
            files: card ? [{ name: "welcome.png", attachment: card }] : [],
            allowedMentions: { users: [member.id] }
        }).catch(() => null);
    }
}
