import { Events, Listener } from "@sapphire/framework";
import { time, type GuildMember, type PartialGuildMember } from "discord.js";
import { DBManager, Dashboard } from "../lib/database";
import { sendLog } from "../lib/eventlog";
import { trackLeave } from "../lib/invites";
import { memberContext, renderMessage } from "../lib/messages";
import { VortexEmbed } from "../lib/structures/embed";

// Someone left: goodbye message, the members log, and the growth chart. Needs the Server Members intent.
export class GuildMemberRemoveListener extends Listener<typeof Events.GuildMemberRemove> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.GuildMemberRemove });
    }

    public async run(member: GuildMember | PartialGuildMember) {
        const { guild, user } = member;

        await Dashboard.recordMemberEvent(guild.id, user.id, "leave").catch(() => null);
        // Invite counts only include members who stayed.
        await trackLeave(guild.id, user.id);

        const roles = member.partial ? null : member.roles.cache.filter((r) => r.id !== guild.id);
        const log = new VortexEmbed()
            .setColor(0xe5484d)
            .setTitle("Member left")
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${user} (${user.tag})`)
            .setFooter({ text: `User ID: ${user.id}` });
        if (member.joinedAt) log.addField("Joined", time(member.joinedAt, "R"), true);
        if (roles?.size) log.addField("Roles", roles.map((r) => `${r}`).join(" ").slice(0, 1000));
        await sendLog(guild, "members", log);

        const { goodbye } = (await DBManager.getGuildConfig(guild.id)).settings;
        if (!goodbye.enabled || !goodbye.channelId) return;

        const channel = await guild.channels.fetch(goodbye.channelId).catch(() => null);
        if (!channel?.isSendable()) return;

        const payload = renderMessage(goodbye.message, memberContext(member, { channelId: channel.id }), guild.id);

        // They've left, so don't ping them.
        await channel.send({ ...payload, allowedMentions: { parse: [] } }).catch(() => null);
    }
}
