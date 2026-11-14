import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /ping: gateway latency and round-trip time.
export class PingCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check how fast the bot is responding");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        // Slash replies return an InteractionCallbackResponse; prefix replies return the Message itself.
        const response = await ctx.reply({ content: "Pinging…", withResponse: true }) as unknown as
            { resource?: { message?: { createdTimestamp: number } | null }; createdTimestamp?: number };
        const sentAt = response.resource?.message?.createdTimestamp ?? response.createdTimestamp ?? Date.now();
        const roundTrip = sentAt - ctx.createdTimestamp;

        const embed = new VortexEmbed()
            .setTitle("Pong!")
            .addField("Gateway", `${Math.round(this.container.client.ws.ping)}ms`, true)
            .addField("Round trip", `${roundTrip}ms`, true);

        return ctx.editReply({ content: "", embeds: [embed] });
    }
}
