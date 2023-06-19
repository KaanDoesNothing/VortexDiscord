import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder} from "discord.js";
import {moderationCategoryName} from "./mod";

export class PurgeCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages")
        .addNumberOption((arg) => arg.setName("amount").setDescription("amount").setRequired(true));

    category = moderationCategoryName;

    userPermissions: PermissionsString[] = ["ManageMessages"];

    async exec(ctx: ChatInputCommandInteraction): Promise<any> {
        const amount = ctx.options.getNumber("amount");
        
        const messages = await ctx.channel?.messages.fetch({limit: amount + 1});
        if(!messages) return;

        messages.forEach(msg => msg.delete());

        const temp = await ctx.reply(`Purged ${amount} messages.`);

        setTimeout(() => {
            temp.delete();
        }, 2000);
    }
}