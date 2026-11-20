import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, type AutocompleteInteraction, type GuildMember, type TextChannel, MessageFlags } from "discord.js";
import { DBManager } from "../../lib/database";
import { closeTicket, openTicket, renderTicketPanel, setTicketAccess, ticketForm, toggleClaim } from "../../lib/utility";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok } from "../../lib/structures/embed";

// /ticket open|close|claim|add|remove|panel: private support channels between a member and staff.
// Set up staff roles, categories, ticket types, forms and the log channel in the dashboard (Utility → Tickets).
export class TicketCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, runIn: ["GUILD_ANY"], requiredClientPermissions: ["ManageChannels"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Private support tickets with the server staff")
        .addSubcommand((s) => s.setName("open").setDescription("Open a private ticket with staff")
            .addStringOption((o) => o.setName("type").setDescription("What kind of ticket").setAutocomplete(true))
            .addStringOption((o) => o.setName("topic").setDescription("What it's about").setMaxLength(200)))
        .addSubcommand((s) => s.setName("close").setDescription("Close the ticket you're in"))
        .addSubcommand((s) => s.setName("claim").setDescription("Claim (or unclaim) this ticket so staff know you're on it"))
        .addSubcommand((s) => s.setName("add").setDescription("Add someone to this ticket")
            .addUserOption((o) => o.setName("user").setDescription("Who to add").setRequired(true)))
        .addSubcommand((s) => s.setName("remove").setDescription("Remove someone from this ticket")
            .addUserOption((o) => o.setName("user").setDescription("Who to remove").setRequired(true)))
        .addSubcommand((s) => s.setName("panel").setDescription("Post the ticket panel (staff only)")
            .addChannelOption((o) => o.setName("channel").setDescription("Where to post it").addChannelTypes(ChannelType.GuildText)));

    public override async autocompleteRun(interaction: AutocompleteInteraction) {
        const { tickets } = (await DBManager.getGuildConfig(interaction.guildId!)).settings;
        const query = interaction.options.getFocused().toLowerCase();
        return interaction.respond(tickets.types.map((t, i) => ({ name: t.name, value: String(i) })).filter((o) => o.name.toLowerCase().includes(query)).slice(0, 25));
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const member = ctx.member as GuildMember;
        const channel = ctx.channel as TextChannel;

        try {
            switch (ctx.options.getSubcommand()) {
                case "open": {
                    const { tickets } = (await DBManager.getGuildConfig(guild.id)).settings;
                    const typeInput = ctx.options.getString("type");
                    // Accept the autocomplete value (index) or a typed name (prefix usage).
                    const typeIndex = typeInput === null ? undefined
                        : /^\d+$/.test(typeInput) ? Number(typeInput) : tickets.types.findIndex((t) => t.name.toLowerCase() === typeInput.toLowerCase());
                    if (typeIndex === -1) return ctx.reply(fail(`There's no ticket type called "${typeInput}".`));

                    // Types with questions open a form first (slash commands only; prefix skips the form).
                    const type = typeIndex !== undefined ? tickets.types[typeIndex] : undefined;
                    if (type?.questions.length && "showModal" in ctx && !Reflect.get(ctx, "isPollyFilled")) return ctx.showModal(ticketForm(typeIndex!, type));

                    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
                    const opened = await openTicket(guild, member, { topic: ctx.options.getString("topic"), typeIndex });
                    return ctx.editReply({ content: `🎫 Your ticket is open: ${opened}` });
                }
                case "close":
                    await ctx.reply({ content: "Closing…", flags: MessageFlags.Ephemeral });
                    return closeTicket(channel, member);
                case "claim": {
                    const result = await toggleClaim(channel, member);
                    return ctx.reply(ok(result.claimed ? `${member} is handling this ticket.` : `${member} unclaimed this ticket.`));
                }
                case "add":
                case "remove": {
                    const user = ctx.options.getUser("user", true);
                    const adding = ctx.options.getSubcommand() === "add";
                    await setTicketAccess(channel, member, user.id, adding);
                    return ctx.reply({ ...ok(adding ? `Added ${user} to this ticket.` : `Removed ${user} from this ticket.`), allowedMentions: { users: adding ? [user.id] : [] } });
                }
                case "panel": {
                    if (!member.permissions.has("ManageGuild")) return ctx.reply(fail("You need Manage Server to post a ticket panel."));
                    const { tickets } = (await DBManager.getGuildConfig(guild.id)).settings;
                    if (!tickets.enabled) return ctx.reply(fail("Turn tickets on in the dashboard first (Utility → Tickets)."));

                    const target = (ctx.options.getChannel("channel") ?? ctx.channel) as TextChannel;
                    await target.send(renderTicketPanel(tickets, guild.id));
                    return ctx.reply(ok(`Ticket panel posted in ${target}.`, true));
                }
            }
        } catch (error) {
            const message = (error as Error).message || "Something went wrong.";
            return ctx.deferred || ctx.replied ? ctx.editReply({ content: message }) : ctx.reply(fail(message));
        }
    }
}
