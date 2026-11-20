import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder } from "discord.js";
import { DBManager, Dashboard } from "../../lib/database";
import { renderStats, STAT_PLACEHOLDERS } from "../../lib/statsChannels";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok, VortexEmbed } from "../../lib/structures/embed";

const PRESETS = {
    members: "👥 Members: {memberCount}",
    humans: "🧑 Humans: {humans}",
    bots: "🤖 Bots: {bots}",
    online: "🟢 Online: {online}",
    boosts: "🚀 Boosts: {boosts}"
} as const;

// /statschannel create|remove|list: voice channels whose names show live server stats.
export class StatsChannelCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredUserPermissions: ["ManageGuild"], requiredClientPermissions: ["ManageChannels"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("statschannel")
        .setDescription("Channels that show live server stats in their name (admins)")
        .addSubcommand((s) => s.setName("create").setDescription("Create a stats channel")
            .addStringOption((o) => o.setName("preset").setDescription("What to show").addChoices(
                ...Object.entries(PRESETS).map(([value, name]) => ({ name, value }))
            ))
            .addStringOption((o) => o.setName("template").setDescription(`Custom text, e.g. "Members: {memberCount}" (overrides the preset)`).setMaxLength(100))
            .addChannelOption((o) => o.setName("category").setDescription("Category to put it in").addChannelTypes(ChannelType.GuildCategory)))
        .addSubcommand((s) => s.setName("remove").setDescription("Stop updating a stats channel (and delete it)")
            .addChannelOption((o) => o.setName("channel").setDescription("The stats channel").addChannelTypes(ChannelType.GuildVoice).setRequired(true)))
        .addSubcommand((s) => s.setName("list").setDescription("All stats channels and the placeholders you can use"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const { settings } = await DBManager.getGuildConfig(guild.id);
        const list = settings.statsChannels;

        switch (ctx.options.getSubcommand()) {
            case "create": {
                if (list.length >= 10) return ctx.reply(fail("A server can have at most 10 stats channels."));
                const template = ctx.options.getString("template") ?? PRESETS[(ctx.options.getString("preset") ?? "members") as keyof typeof PRESETS];
                const category = ctx.options.getChannel("category");

                // A voice channel nobody can join: just a label in the channel list.
                const channel = await guild.channels.create({
                    name: await renderStats(guild, template),
                    type: ChannelType.GuildVoice,
                    parent: category?.id,
                    permissionOverwrites: [{ id: guild.roles.everyone.id, deny: ["Connect"] }, { id: guild.members.me!.id, allow: ["Connect", "ManageChannels", "ViewChannel"] }],
                    reason: `Stats channel created by ${ctx.user.tag}`
                });
                const { errors } = await Dashboard.patchSettings(guild.id, { statsChannels: [...list, { channelId: channel.id, template }] });
                if (errors.length) return ctx.reply(fail(errors.join(". ")));
                return ctx.reply(ok(`Created ${channel}. It updates every 10 minutes.`));
            }
            case "remove": {
                const channel = ctx.options.getChannel("channel", true);
                if (!list.some((s) => s.channelId === channel.id)) return ctx.reply(fail("That isn't a stats channel."));
                await Dashboard.patchSettings(guild.id, { statsChannels: list.filter((s) => s.channelId !== channel.id) });
                await guild.channels.cache.get(channel.id)?.delete(`Stats channel removed by ${ctx.user.tag}`).catch(() => null);
                return ctx.reply(ok("Stats channel removed."));
            }
            default: {
                const embed = new VortexEmbed().setTitle("📊 Stats channels")
                    .setDescription(list.map((s) => `<#${s.channelId}>: \`${s.template}\``).join("\n") || "None yet. Create one with `/statschannel create`.")
                    .addField("Placeholders", Object.entries(STAT_PLACEHOLDERS).map(([k, v]) => `\`${k}\` ${v}`).join("\n"));
                return ctx.reply({ embeds: [embed] });
            }
        }
    }
}
