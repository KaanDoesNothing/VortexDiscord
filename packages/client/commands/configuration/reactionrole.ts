import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import { addReactionRole, listReactionRoles, parseEmojiInput, removeReactionRole } from "../../lib/reactionRoles";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok, VortexEmbed } from "../../lib/structures/embed";

// "https://discord.com/channels/<guild>/<channel>/<message>" → its parts.
const MESSAGE_LINK = /channels\/(\d+)\/(\d+)\/(\d+)/;

// /reactionrole add|remove|list: react on a message to get a role. For button or menu panels,
// use the dashboard's Role panels page instead.
export class ReactionRoleCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["rr"], requiredUserPermissions: ["ManageRoles"], requiredClientPermissions: ["ManageRoles", "AddReactions"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("reactionrole")
        .setDescription("Give members a role when they react to a message (admins)")
        .addSubcommand((s) => s.setName("add").setDescription("Link an emoji on a message to a role")
            .addStringOption((o) => o.setName("message").setDescription("Link to the message (right-click → Copy Message Link)").setRequired(true))
            .addStringOption((o) => o.setName("emoji").setDescription("The emoji to react with").setRequired(true))
            .addRoleOption((o) => o.setName("role").setDescription("The role to give").setRequired(true)))
        .addSubcommand((s) => s.setName("remove").setDescription("Unlink an emoji from a message")
            .addStringOption((o) => o.setName("message").setDescription("Link to the message").setRequired(true))
            .addStringOption((o) => o.setName("emoji").setDescription("The emoji").setRequired(true)))
        .addSubcommand((s) => s.setName("list").setDescription("All reaction roles on this server"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        const sub = ctx.options.getSubcommand();

        if (sub === "list") {
            const rows = await listReactionRoles(guild.id);
            const embed = new VortexEmbed().setTitle("Reaction roles")
                .setDescription(rows.map((r) => `${/^\d+$/.test(r.emoji) ? `<:e:${r.emoji}>` : r.emoji} → <@&${r.roleId}> · [message](https://discord.com/channels/${r.guildId}/${r.channelId}/${r.messageId})`).join("\n").slice(0, 4000) || "None yet. Add one with `/reactionrole add`.");
            return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
        }

        const link = ctx.options.getString("message", true).match(MESSAGE_LINK);
        if (!link || link[1] !== guild.id) return ctx.reply(fail("That isn't a link to a message on this server."));
        const [, , channelId, messageId] = link as unknown as [string, string, string, string];
        const emoji = parseEmojiInput(ctx.options.getString("emoji", true));

        if (sub === "remove") {
            const removed = await removeReactionRole(guild.id, messageId, emoji);
            return ctx.reply(removed ? ok("Reaction role removed.") : fail("There's no reaction role with that emoji on that message."));
        }

        const role = ctx.options.getRole("role", true);
        const real = guild.roles.cache.get(role.id);
        if (!real?.editable || real.managed) return ctx.reply(fail(`I can't give ${role}: it's above my highest role or managed by an integration.`));

        const channel = guild.channels.cache.get(channelId) as GuildTextBasedChannel | undefined;
        const message = channel?.isTextBased() ? await channel.messages.fetch(messageId).catch(() => null) : null;
        if (!message) return ctx.reply(fail("I can't find that message (or can't see its channel)."));

        // React first so members can just click it; this also checks the emoji is usable.
        const reacted = await message.react(ctx.options.getString("emoji", true).trim()).then(() => true, () => false);
        if (!reacted) return ctx.reply(fail("I can't use that emoji (it has to be a normal emoji or one from this server)."));

        await addReactionRole({ guildId: guild.id, channelId, messageId, emoji, roleId: role.id });
        return ctx.reply({ ...ok(`Reacting with ${ctx.options.getString("emoji", true)} on [that message](${message.url}) now gives ${role}.`), allowedMentions: { parse: [] } });
    }
}
