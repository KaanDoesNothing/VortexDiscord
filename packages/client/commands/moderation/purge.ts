import { Command } from "@sapphire/framework";
import {EmbedBuilder, SlashCommandBuilder} from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

export class PurgeCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {...options,
            requiredClientPermissions: ["ManageMessages"],
            requiredUserPermissions: ["ManageMessages"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages")
        .addNumberOption((arg) => arg.setName("amount").setDescription("amount").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        console.log(true)
        const amount = ctx.options.getNumber("amount")!;
        
        const messages = await ctx.channel!.messages.fetch({limit: amount + 1});
        if(!messages) return ctx.reply({content: "No Messages to purge"});

        messages.forEach(msg => msg.delete());

        const temp = await ctx.reply(`Purged ${amount} messages.`);

        setTimeout(() => {
            temp.delete();
        }, 2000);
    }
}