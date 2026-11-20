import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, type GuildMember, type VoiceChannel } from "discord.js";
import { setTempOwner, tempChannelOwner } from "../../lib/tempVoice";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok } from "../../lib/structures/embed";

// /voice rename|limit|lock|unlock|hide|show|kick|claim: manage the "join to create" channel you're in.
export class VoiceCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["vc"], requiredClientPermissions: ["ManageChannels", "MoveMembers"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("voice")
        .setDescription("Manage your temporary voice channel")
        .addSubcommand((s) => s.setName("rename").setDescription("Rename your channel")
            .addStringOption((o) => o.setName("name").setDescription("New name").setMaxLength(100).setRequired(true)))
        .addSubcommand((s) => s.setName("limit").setDescription("Set how many people can join (0 = no limit)")
            .addIntegerOption((o) => o.setName("users").setDescription("Max users").setMinValue(0).setMaxValue(99).setRequired(true)))
        .addSubcommand((s) => s.setName("lock").setDescription("Stop anyone else from joining"))
        .addSubcommand((s) => s.setName("unlock").setDescription("Let people join again"))
        .addSubcommand((s) => s.setName("hide").setDescription("Hide the channel from everyone not in it"))
        .addSubcommand((s) => s.setName("show").setDescription("Make the channel visible again"))
        .addSubcommand((s) => s.setName("kick").setDescription("Disconnect someone from your channel")
            .addUserOption((o) => o.setName("member").setDescription("Who to kick").setRequired(true)))
        .addSubcommand((s) => s.setName("claim").setDescription("Take over the channel if its owner left"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.member as GuildMember;
        const channel = member.voice.channel as VoiceChannel | null;
        if (!channel) return ctx.reply(fail("Join your temporary voice channel first."));

        const owner = tempChannelOwner(channel.id);
        if (!owner) return ctx.reply(fail("This isn't a temporary voice channel."));

        const sub = ctx.options.getSubcommand();
        if (sub === "claim") {
            if (owner === member.id) return ctx.reply(fail("It's already yours."));
            if (channel.members.has(owner)) return ctx.reply(fail(`<@${owner}> is still here.`));
            await setTempOwner(channel.id, member.id);
            await channel.permissionOverwrites.edit(member.id, { ManageChannels: true, MoveMembers: true, Connect: true, ViewChannel: true });
            await channel.permissionOverwrites.delete(owner).catch(() => null);
            return ctx.reply(ok("The channel is yours now."));
        }

        if (owner !== member.id) return ctx.reply(fail("Only the channel's owner can do that (or use `/voice claim` once they've left)."));
        const everyone = ctx.guild!.roles.everyone;

        switch (sub) {
            case "rename":
                await channel.setName(ctx.options.getString("name", true));
                return ctx.reply(ok(`Renamed to **${channel.name}**. (Discord allows 2 renames per 10 minutes.)`));
            case "limit": {
                const users = ctx.options.getInteger("users", true);
                await channel.setUserLimit(users);
                return ctx.reply(ok(users ? `Limit set to **${users}**.` : "No user limit."));
            }
            case "lock":
                await channel.permissionOverwrites.edit(everyone, { Connect: false });
                return ctx.reply(ok("🔒 Locked. People already here can stay."));
            case "unlock":
                await channel.permissionOverwrites.edit(everyone, { Connect: null });
                return ctx.reply(ok("🔓 Unlocked."));
            case "hide":
                await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
                return ctx.reply(ok("🙈 Hidden."));
            case "show":
                await channel.permissionOverwrites.edit(everyone, { ViewChannel: null });
                return ctx.reply(ok("👀 Visible again."));
            case "kick": {
                const target = ctx.options.getUser("member", true);
                const targetMember = channel.members.get(target.id);
                if (!targetMember) return ctx.reply(fail(`${target} isn't in your channel.`));
                await targetMember.voice.disconnect("Kicked from temp voice channel by its owner");
                return ctx.reply({ ...ok(`Disconnected ${target}.`), allowedMentions: { parse: [] } });
            }
        }
        return ctx.reply(fail("Unknown option."));
    }
}
