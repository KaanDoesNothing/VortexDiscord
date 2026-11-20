import { Command } from "@sapphire/framework";
import { PermissionFlagsBits, SlashCommandBuilder, type AutocompleteInteraction, type GuildMember } from "discord.js";
import { Economy } from "../../lib/database";
import { economyFor } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok, VortexEmbed } from "../../lib/structures/embed";

const MAX_ITEMS = 50;

// /shop view|buy|add|remove: the server's shop. Items either give a role or go in your /inventory.
// Admins (Manage Server) add and remove items here or in the dashboard (Economy → Shop).
export class ShopCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["store"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Browse and buy items and roles from this server's shop")
        .addSubcommand((s) => s.setName("view").setDescription("See what's for sale"))
        .addSubcommand((s) => s.setName("buy").setDescription("Buy an item")
            .addStringOption((o) => o.setName("item").setDescription("What to buy").setRequired(true).setAutocomplete(true))
            .addIntegerOption((o) => o.setName("quantity").setDescription("How many (default 1)").setMinValue(1).setMaxValue(100)))
        .addSubcommand((s) => s.setName("add").setDescription("Add an item to the shop (admins)")
            .addStringOption((o) => o.setName("name").setDescription("Item name").setMaxLength(50).setRequired(true))
            .addIntegerOption((o) => o.setName("price").setDescription("Price").setMinValue(0).setMaxValue(1_000_000_000).setRequired(true))
            .addRoleOption((o) => o.setName("role").setDescription("Role given when bought (leave empty for an inventory item)"))
            .addStringOption((o) => o.setName("description").setDescription("Shown in the shop").setMaxLength(200))
            .addIntegerOption((o) => o.setName("stock").setDescription("How many can be sold in total (empty = unlimited)").setMinValue(0).setMaxValue(1_000_000)))
        .addSubcommand((s) => s.setName("remove").setDescription("Remove an item from the shop (admins)")
            .addStringOption((o) => o.setName("item").setDescription("Item to remove").setRequired(true).setAutocomplete(true)));

    public override async autocompleteRun(interaction: AutocompleteInteraction) {
        const query = interaction.options.getFocused().toLowerCase();
        const items = await Economy.listShopItems(interaction.guildId!, interaction.options.getSubcommand() === "buy");
        return interaction.respond(items
            .filter((i) => i.name.toLowerCase().includes(query))
            .slice(0, 25)
            .map((i) => ({ name: `${i.name} · ${i.price.toLocaleString("en-US")}`.slice(0, 100), value: String(i.id) })));
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;
        const eco = await economyFor(guildId);
        const sub = ctx.options.getSubcommand();
        const isAdmin = (ctx.member as GuildMember | null)?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;

        if ((sub === "add" || sub === "remove") && !isAdmin) return ctx.reply(fail("You need **Manage Server** to change the shop."));

        if (sub === "view") {
            const items = await Economy.listShopItems(guildId, true);
            const embed = new VortexEmbed().setTitle(`🛒 ${ctx.guild!.name} shop`);
            if (!items.length) embed.setDescription(isAdmin ? "The shop is empty. Add items with `/shop add` or in the dashboard." : "The shop is empty.");
            for (const item of items.slice(0, 25)) {
                const details = [
                    item.description,
                    item.roleId ? `Gives <@&${item.roleId}>` : null,
                    item.stock !== null ? `${item.stock} left` : null,
                    item.requiredRoleId ? `Requires <@&${item.requiredRoleId}>` : null
                ].filter(Boolean).join(" · ");
                embed.addField(`${item.emoji ? `${item.emoji} ` : ""}${item.name} · ${eco.format(item.price)}`, details || "​");
            }
            embed.setFooter({ text: "Buy with /shop buy · see what you own with /inventory" });
            return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
        }

        if (sub === "add") {
            if (await Economy.countShopItems(guildId) >= MAX_ITEMS) return ctx.reply(fail(`A shop can have at most ${MAX_ITEMS} items.`));
            const role = ctx.options.getRole("role");
            if (role && (!ctx.guild!.roles.cache.get(role.id)?.editable || role.managed)) {
                return ctx.reply(fail(`I can't give ${role}: it's above my highest role or managed by an integration.`));
            }
            const item = await Economy.createShopItem(guildId, {
                name: ctx.options.getString("name", true),
                price: ctx.options.getInteger("price", true),
                description: ctx.options.getString("description") ?? "",
                emoji: "",
                roleId: role?.id ?? null,
                stock: ctx.options.getInteger("stock"),
                maxPerUser: role ? 1 : 0,
                requiredRoleId: null,
                enabled: true
            });
            return ctx.reply(ok(`Added **${item.name}** for ${eco.format(item.price)}.`));
        }

        const item = await Economy.getShopItem(guildId, Number(ctx.options.getString("item", true)) || 0)
            ?? (await Economy.listShopItems(guildId)).find((i) => i.name.toLowerCase() === ctx.options.getString("item", true).toLowerCase());
        if (!item) return ctx.reply(fail("There's no item like that in the shop."));

        if (sub === "remove") {
            await Economy.deleteShopItem(guildId, item.id);
            return ctx.reply(ok(`Removed **${item.name}** from the shop.`));
        }

        // Buy.
        const member = ctx.member as GuildMember;
        const quantity = item.roleId ? 1 : ctx.options.getInteger("quantity") ?? 1;
        if (item.requiredRoleId && !member.roles.cache.has(item.requiredRoleId)) return ctx.reply(fail(`You need <@&${item.requiredRoleId}> to buy this.`));
        if (item.roleId && member.roles.cache.has(item.roleId)) return ctx.reply(fail("You already have that role."));
        const role = item.roleId ? ctx.guild!.roles.cache.get(item.roleId) : null;
        if (item.roleId && (!role || !role.editable)) return ctx.reply(fail("I can't give that role anymore. Ask an admin to check the shop."));

        const result = await Economy.buyItem(eco.scope, guildId, ctx.user.id, item, quantity, eco.config.startingBalance);
        if (!result.ok) {
            return ctx.reply(fail(result.reason === "insufficient" ? `You need ${eco.format(item.price * quantity)} in your wallet.` : result.reason));
        }

        if (role) {
            const given = await member.roles.add(role, `Bought in the shop for ${item.price}`).then(() => true, () => false);
            if (!given) {
                await Economy.refundItem(eco.scope, ctx.user.id, item, quantity);
                return ctx.reply(fail("I couldn't give you the role, so you weren't charged."));
            }
        }

        const what = role ? `the ${role} role` : `${quantity > 1 ? `${quantity}× ` : ""}**${item.name}**`;
        return ctx.reply({ ...ok(`You bought ${what} for ${eco.format(item.price * quantity)}. Wallet: ${eco.format(result.balance)}`), allowedMentions: { parse: [] } });
    }
}
