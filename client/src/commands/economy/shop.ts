import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {economyCategoryName} from "./mod";
import {VortexEmbed} from "../../lib/structures/Embed";
import {VortexItems} from "../../lib/user/items";

export class ShopCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("shop")
        .setDescription("View shop");

    category = economyCategoryName;
    dev = true

    exec(ctx: ChatInputCommandInteraction): InteractionReplyOptions {
        const shopEmbed = new VortexEmbed()
            .setTitle("Shop");
        
        VortexItems.filter(item => item.buyable).forEach(item => shopEmbed.addField(item.name, item.price.toString()));

        return {embeds: [shopEmbed]};
    }
}