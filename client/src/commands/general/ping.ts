import { VortexCommand } from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {generalCategoryName} from "./mod";
import {VortexEmbed} from "../../lib/structures/Embed";

export class PingCommand extends VortexCommand {
    config = new SlashCommandBuilder().setName("ping").setDescription("Woah Ping command nice hm?!")

    category = generalCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<any> {
        const embed = new VortexEmbed()
            .setTitle("Pong!")
            .addField("API", this.client.ws.ping.toString());

        if((ctx as any).isPollyFilled) {
            const sent = await ctx.reply("Pinging...");
            embed.addField("Message", `${ctx.createdTimestamp - sent.createdTimestamp}ms`);

            await sent.edit({embeds: [embed]})
        }else {
            const sent = await ctx.reply({ content: 'Pinging...', fetchReply: true });
            embed.addField("Message", `${sent.createdTimestamp - ctx.createdTimestamp}ms`);
            await ctx.editReply({embeds: [embed]});
        }
    }
}