import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { DBManager, Economy } from "../../lib/database";
import { ECONOMY, getCurrency, randomInt } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /rob <member>: try to steal part of someone's wallet. Coins in the bank are safe.
// Failing costs you a fine. Every 3 hours.
export class RobCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["steal"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("rob")
        .setDescription("Try to steal from someone's wallet (banked coins are safe); fail and you pay a fine")
        .addUserOption((o) => o.setName("member").setDescription("Who to rob").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const target = ctx.options.getUser("member", true);
        const { chance, minVictimWallet, shareMin, shareMax, fineMin, fineMax, cooldownMs } = ECONOMY.rob;
        const currency = await getCurrency(ctx.guildId);

        if (target.id === ctx.user.id) return ctx.reply({ content: "You can't rob yourself.", ephemeral: true });
        if (target.bot) return ctx.reply({ content: "Bots keep their coins in an unbreakable vault.", ephemeral: true });

        const victim = await DBManager.getUser(target.id);
        if (victim.balance < minVictimWallet) {
            return ctx.reply({ content: `${target.displayName} has less than ${currency.format(minVictimWallet)} in their wallet. Not worth it.`, ephemeral: true });
        }

        const claim = await Economy.claimCooldown(ctx.user.id, "rob", cooldownMs);
        if (!claim.ok) return ctx.reply({ content: `👀 People are watching you. Try again ${time(claim.readyAt, "R")}.`, ephemeral: true });

        if (Math.random() < chance) {
            const amount = Math.max(1, Math.floor(victim.balance * (shareMin + Math.random() * (shareMax - shareMin))));
            // They may have spent or banked it in the meantime.
            const stolen = await Economy.steal(ctx.user.id, target.id, amount);
            if (stolen) {
                return ctx.reply({ content: `💰 You robbed ${target} and got away with ${currency.format(amount)}!`, allowedMentions: { users: [target.id] } });
            }
            return ctx.reply({ content: `${target.displayName}'s wallet was empty by the time you got there.` });
        }

        const taken = await Economy.fine(ctx.user.id, randomInt(fineMin, fineMax));
        return ctx.reply({ content: `🚓 You got caught trying to rob ${target.displayName} and paid a fine of ${currency.format(taken)}.` });
    }
}
