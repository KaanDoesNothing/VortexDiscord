import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, type AutocompleteInteraction } from "discord.js";
import { Economy } from "../../lib/database";
import { fail, ok, VortexEmbed } from "../../lib/structures/embed";
import { VortexCommand } from "../../lib/structures/command";

// /inventory [member]: items bought from this server's /shop.
export class InventoryCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, name: "inventory", aliases: ["inv", "items"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("See the items you (or someone else) bought from this server's shop")
        .addUserOption((o) => o.setName("member").setDescription("Whose inventory to show (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("member") ?? ctx.user;
        const items = await Economy.getInventory(ctx.guildId!, user.id);

        const embed = new VortexEmbed()
            .setAuthor({ name: `${user.displayName}'s inventory`, iconURL: user.displayAvatarURL() })
            .setDescription(items.map(({ item, quantity }) => `${item.emoji || "📦"} **${item.name}** × ${quantity}${item.description ? `\n-# ${item.description}` : ""}`).join("\n") || "Nothing here yet. Check out `/shop view`.");

        return ctx.reply({ embeds: [embed] });
    }
}

// /use <item>: uses up one of an item (posts that you used it, e.g. for event tickets or perks).
export class UseCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, name: "use", runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("use")
        .setDescription("Use one of the items in your inventory")
        .addStringOption((o) => o.setName("item").setDescription("The item to use").setRequired(true).setAutocomplete(true));

    public override async autocompleteRun(interaction: AutocompleteInteraction) {
        const query = interaction.options.getFocused().toLowerCase();
        const items = await Economy.getInventory(interaction.guildId!, interaction.user.id);
        return interaction.respond(items.filter(({ item }) => item.name.toLowerCase().includes(query)).slice(0, 25)
            .map(({ item, quantity }) => ({ name: `${item.name} (×${quantity})`.slice(0, 100), value: String(item.id) })));
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const input = ctx.options.getString("item", true);
        const items = await Economy.getInventory(ctx.guildId!, ctx.user.id);
        const owned = items.find(({ item }) => String(item.id) === input || item.name.toLowerCase() === input.toLowerCase());
        if (!owned) return ctx.reply(fail("You don't have that item. See `/inventory`."));

        if (!await Economy.consumeItem(ctx.guildId!, ctx.user.id, owned.item.id)) return ctx.reply(fail("You don't have that item anymore."));
        return ctx.reply(ok(`${ctx.user} used ${owned.item.emoji || "📦"} **${owned.item.name}**. (${owned.quantity - 1} left)`));
    }
}
