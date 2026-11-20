import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { lastVote, VOTE_COOLDOWN_MS, VOTE_REWARD } from "../../lib/botlists";
import { linkButtons, voteUrl } from "../../lib/links";
import { VortexCommand } from "../../lib/structures/command";
import { fail, VortexEmbed } from "../../lib/structures/embed";

// /vote: link to vote for the bot (helps it grow) and the reward for doing so.
export class VoteCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("vote")
        .setDescription("Vote for the bot on top.gg and get free coins");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        if (!voteUrl(ctx.client)) return ctx.reply(fail("Voting isn't set up for this bot."));

        const last = await lastVote(ctx.user.id);
        const next = last ? new Date(last.getTime() + VOTE_COOLDOWN_MS) : null;
        const embed = new VortexEmbed()
            .setTitle("💜 Vote for the bot")
            .setDescription(`Voting helps more servers find the bot. Every vote gives you 🪙 **${VOTE_REWARD.toLocaleString("en-US")}** coins in the global economy (double on weekends).`)
            .addField("Your next vote", next && next > new Date() ? time(next, "R") : "Available now!");
        return ctx.reply({ embeds: [embed], components: linkButtons(ctx.client, ["vote"]) });
    }
}
