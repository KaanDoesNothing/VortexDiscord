import { Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } from "discord.js";
import { Economy } from "../../lib/database";
import { economyFor } from "../../lib/economy";
import { replyAndFetch, VortexCommand } from "../../lib/structures/command";
import { fail, ok, warn } from "../../lib/structures/embed";

// /economy give|take|reset: admin tools for a server running its own economy (Dashboard → Economy → mode).
// Not available with the shared global economy, so no server can create coins for everyone.
export class EconomyAdminCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("economy")
        .setDescription("Give or take coins, or reset this server's economy (admins, server economy only)")
        .addSubcommand((s) => s.setName("give").setDescription("Add coins to a member's wallet")
            .addUserOption((o) => o.setName("member").setDescription("Who gets the coins").setRequired(true))
            .addIntegerOption((o) => o.setName("amount").setDescription("How many").setMinValue(1).setMaxValue(1_000_000_000).setRequired(true)))
        .addSubcommand((s) => s.setName("take").setDescription("Remove coins from a member's wallet")
            .addUserOption((o) => o.setName("member").setDescription("Whose coins to take").setRequired(true))
            .addIntegerOption((o) => o.setName("amount").setDescription("How many").setMinValue(1).setMaxValue(1_000_000_000).setRequired(true)))
        .addSubcommand((s) => s.setName("reset").setDescription("Delete every balance and inventory on this server (asks to confirm)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const eco = await economyFor(ctx.guildId);
        if (eco.mode !== "server") {
            return ctx.reply(fail("This server uses the shared global economy, so balances can't be edited. Switch to a server economy in the dashboard (Economy → Mode) first."));
        }

        const sub = ctx.options.getSubcommand();
        if (sub === "reset") {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId("confirm").setLabel("Reset the economy").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
            );
            const message = await replyAndFetch(ctx, { ...warn("This deletes **every balance, bank and inventory** on this server. It can't be undone."), components: [row] });
            const click = await message.awaitMessageComponent({ componentType: ComponentType.Button, filter: (i) => i.user.id === ctx.user.id, time: 30_000 }).catch(() => null);
            if (!click || click.customId === "cancel") return message.edit({ embeds: ok("Cancelled. Nothing was changed.").embeds, components: [] }).catch(() => null);

            const count = await Economy.resetScope(eco.scope);
            return click.update({ embeds: ok(`Reset the economy (${count.toLocaleString("en-US")} wallets).`).embeds, components: [] });
        }

        const user = ctx.options.getUser("member", true);
        if (user.bot) return ctx.reply(fail("Bots don't have a balance."));
        const amount = ctx.options.getInteger("amount", true);

        // Taking never goes below zero.
        const wallet = await eco.wallet(user.id);
        const delta = sub === "give" ? amount : -Math.min(amount, wallet.balance);
        const balance = await eco.adjust(user.id, delta);
        return ctx.reply({ ...ok(`${sub === "give" ? "Gave" : "Took"} ${eco.format(Math.abs(delta))} ${sub === "give" ? "to" : "from"} ${user}. Wallet: ${eco.format(balance ?? 0)}`), allowedMentions: { parse: [] } });
    }
}
