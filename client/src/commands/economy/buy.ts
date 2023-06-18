import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {economyCategoryName} from "./mod";
import {getBuyableItems, getInventoryItem} from "../../lib/user/items";
import {UserTable} from "../../lib/Database";
import {NotEnoughBalance, NoUserDBEntry} from "../../lib/Language";

console.log(getBuyableItems());

export class BuyCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Buy an item")
        .addStringOption((arg) => arg.setName("item").setDescription("item").addChoices(...getBuyableItems().map(item => {
            return {
                name: item.name || "oops",
                value: item.identifier || "oops"
            }
        })))

    category = economyCategoryName;
    dev = true;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const item = ctx.options.getString("item");

        const userData = await UserTable.findOne({user_id: ctx.user.id});
        if(!userData) return {content: NoUserDBEntry};

        const itemData = getInventoryItem(item);
        if(!itemData) return {content: "Invalid item"};

        if(itemData.price > userData.economy.money.value) return {content: NotEnoughBalance}

        userData.economy.money.value = userData.economy.money.value - itemData.price;
        userData.inventory.items.push(itemData.identifier);
        await userData.save();

        return {content: `You've bought a ${itemData.name}!`};
    }
}