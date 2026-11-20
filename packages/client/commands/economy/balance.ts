import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { economyFor } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /balance [member]: wallet and bank. Balances are global (shared across servers).
export class BalanceCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["bal", "wallet"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Check your wallet and bank, or someone else's")
        .addUserOption((option) => option.setName("member").setDescription("Whose balance to check (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("member") ?? ctx.user;
        if (user.bot) return ctx.reply({ content: "Bots don't have a balance.", flags: MessageFlags.Ephemeral });

        const eco = await economyFor(ctx.guildId);
        const data = await eco.wallet(user.id);

        const embed = new VortexEmbed()
            .setAuthor({ name: `${user.displayName}'s balance`, iconURL: user.displayAvatarURL() })
            .addField("Wallet", eco.format(data.balance), true)
            .addField("Bank", eco.format(data.bank), true)
            .addField("Total", eco.format(data.balance + data.bank), true)
            .setFooter({ text: "Coins in the bank are safe from /rob" });

        return ctx.reply({ embeds: [embed] });
    }
}
