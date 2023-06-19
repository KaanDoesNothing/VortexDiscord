import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {UserTable} from "../../lib/Database";
import {socialCategoryName} from "./mod";
import {NoUserDBEntry} from "../../lib/Language";

export class BioCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("bio")
        .setDescription("Change your bio")
        .addStringOption((arg) => arg.setName("input").setDescription("your new bio").setRequired(true));

    category = socialCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const input = ctx.options.getString("input");

        const userData = await UserTable.findOne({user_id: ctx.user.id});
        if(!userData) return {content: NoUserDBEntry};

        userData.set("profile.description", input);

        await userData.save();

        return {content: "Your bio has been updated!"};
    }
}