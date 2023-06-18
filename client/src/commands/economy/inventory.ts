import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {economyCategoryName} from "./mod";
import {UserTable} from "../../lib/Database";
import {InventoryEmpty, NoUserDBEntry} from "../../lib/Language";
import {VortexEmbed} from "../../lib/structures/Embed";
import {getInventoryItem} from "../../lib/user/items";

export class InventoryCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("View your inventory");

    category = economyCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const userData = await UserTable.findOne({user_id: ctx.user.id});
        if(!userData) return {content: NoUserDBEntry};

        if(userData.inventory.items.length < 1) return {content: InventoryEmpty};

        const inventoryEmbed = new VortexEmbed()
            .setDescription(userData.inventory.items.map(item => getInventoryItem(item).name).join(", "));

        return {embeds: [inventoryEmbed]};
    }
}