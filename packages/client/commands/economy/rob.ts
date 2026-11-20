import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time, MessageFlags } from "discord.js";
import { ECONOMY, economyFor, randomInt } from "../../lib/economy";
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
        const eco = await economyFor(ctx.guildId);
        const { minVictimWallet, shareMin, shareMax, fineMin, fineMax } = ECONOMY.rob;
        const chance = eco.config.rob.chance / 100;
        const cooldownMs = eco.config.rob.cooldownMinutes * 60_000;

        if (!eco.config.rob.enabled) return ctx.reply({ content: "Robbing is turned off on this server.", flags: MessageFlags.Ephemeral });

        if (target.id === ctx.user.id) return ctx.reply({ content: "You can't rob yourself.", flags: MessageFlags.Ephemeral });
        if (target.bot) return ctx.reply({ content: "Bots keep their coins in an unbreakable vault.", flags: MessageFlags.Ephemeral });

        const victim = await eco.wallet(target.id);
        if (victim.balance < minVictimWallet) {
            return ctx.reply({ content: `${target.displayName} has less than ${eco.format(minVictimWallet)} in their wallet. Not worth it.`, flags: MessageFlags.Ephemeral });
        }

        const claim = await eco.claimCooldown(ctx.user.id, "rob", cooldownMs);
        if (!claim.ok) return ctx.reply({ content: `👀 People are watching you. Try again ${time(claim.readyAt, "R")}.`, flags: MessageFlags.Ephemeral });

        if (Math.random() < chance) {
            const amount = Math.max(1, Math.floor(victim.balance * (shareMin + Math.random() * (shareMax - shareMin))));
            // They may have spent or banked it in the meantime.
            const stolen = await eco.steal(ctx.user.id, target.id, amount);
            if (stolen) {
                return ctx.reply({ content: `💰 You robbed ${target} and got away with ${eco.format(amount)}!`, allowedMentions: { users: [target.id] } });
            }
            return ctx.reply({ content: `${target.displayName}'s wallet was empty by the time you got there.` });
        }

        const taken = await eco.fine(ctx.user.id, randomInt(fineMin, fineMax));
        return ctx.reply({ content: `🚓 You got caught trying to rob ${target.displayName} and paid a fine of ${eco.format(taken)}.` });
    }
}
