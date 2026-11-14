import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, type GuildMember, type TextChannel } from "discord.js";
import { DBManager, Utility } from "../../lib/database";
import { closeTicket, openTicket, ticketPanelButton } from "../../lib/utility";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /ticket open|close|panel|add: private support channels between a member and staff.
// Set up staff roles, category and log channel in the dashboard (Utility → Tickets).
export class TicketCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, runIn: ["GUILD_ANY"], requiredClientPermissions: ["ManageChannels"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Private support tickets with the server staff")
        .addSubcommand((s) => s.setName("open").setDescription("Open a private ticket with staff")
            .addStringOption((o) => o.setName("topic").setDescription("What it's about").setMaxLength(200)))
        .addSubcommand((s) => s.setName("close").setDescription("Close the ticket you're in"))
        .addSubcommand((s) => s.setName("panel").setDescription("Post an \"Open a ticket\" button (staff only)")
            .addChannelOption((o) => o.setName("channel").setDescription("Where to post it").addChannelTypes(ChannelType.GuildText)))
        .addSubcommand((s) => s.setName("add").setDescription("Add someone to this ticket")
            .addUserOption((o) => o.setName("user").setDescription("Who to add").setRequired(true)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const member = ctx.member as GuildMember;

        try {
            switch (ctx.options.getSubcommand()) {
                case "open": {
                    await ctx.deferReply({ ephemeral: true });
                    const channel = await openTicket(guild, member, ctx.options.getString("topic"));
                    return ctx.editReply({ content: `🎫 Your ticket is open: ${channel}` });
                }
                case "close": {
                    await ctx.reply({ content: "Closing…", ephemeral: true });
                    return closeTicket(ctx.channel as TextChannel, member);
                }
                case "panel": {
                    if (!member.permissions.has("ManageGuild")) return ctx.reply({ content: "You need Manage Server to post a ticket panel.", ephemeral: true });
                    const { tickets } = (await DBManager.getGuildConfig(guild.id)).settings;
                    if (!tickets.enabled) return ctx.reply({ content: "Turn tickets on in the dashboard first (Utility → Tickets).", ephemeral: true });

                    const channel = (ctx.options.getChannel("channel") ?? ctx.channel) as TextChannel;
                    await channel.send({
                        embeds: [new VortexEmbed().setTitle("🎫 Need help?").setDescription("Click the button below to open a private ticket with the staff team.")],
                        components: [ticketPanelButton()]
                    });
                    return ctx.reply({ content: `Ticket panel posted in ${channel}.`, ephemeral: true });
                }
                case "add": {
                    const ticket = await Utility.getTicketByChannel(ctx.channelId);
                    if (!ticket) return ctx.reply({ content: "Use this inside a ticket channel.", ephemeral: true });
                    const user = ctx.options.getUser("user", true);
                    await (ctx.channel as TextChannel).permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                    return ctx.reply({ content: `Added ${user} to this ticket.`, allowedMentions: { users: [user.id] } });
                }
            }
        } catch (error) {
            const content = (error as Error).message || "Something went wrong.";
            return ctx.deferred || ctx.replied ? ctx.editReply({ content }) : ctx.reply({ content, ephemeral: true });
        }
    }
}
