import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

export class PingCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Bot latency")

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const embed = new VortexEmbed()
            .setTitle("Pong!")
            .addFields({name: "API", value: this.container.client.ws.ping.toString()});

        if((ctx as any).isPollyFilled) {
            const sent = await ctx.reply("Pinging...");
            embed.addFields({name: "Message", value: `${ctx.createdTimestamp - sent.createdTimestamp}ms`});

            await sent.edit({embeds: [embed]})
        }else {
            const sent = await ctx.reply({ content: 'Pinging...', fetchReply: true });
            embed.addFields({name: "Message", value: `${ctx.createdTimestamp - sent.createdTimestamp}ms`});
            await ctx.editReply({embeds: [embed]});
        }
    }
}