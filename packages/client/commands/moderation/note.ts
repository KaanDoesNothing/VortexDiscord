import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { DBManager } from "../../lib/database";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /note add|list|remove: private notes moderators keep about a member. Replies are only visible to the moderator.
export class NoteCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            aliases: ["notes"],
            requiredUserPermissions: ["ModerateMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("note")
        .setDescription("Private moderator notes about a member")
        .addSubcommand((s) => s.setName("add").setDescription("Add a note about a member")
            .addUserOption((o) => o.setName("user").setDescription("Who the note is about").setRequired(true))
            .addStringOption((o) => o.setName("text").setDescription("The note").setMaxLength(1000).setRequired(true)))
        .addSubcommand((s) => s.setName("list").setDescription("Show the notes about a member")
            .addUserOption((o) => o.setName("user").setDescription("Whose notes to show").setRequired(true)))
        .addSubcommand((s) => s.setName("remove").setDescription("Delete a note by its number")
            .addIntegerOption((o) => o.setName("id").setDescription("The note number shown in /note list").setRequired(true)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guild!.id;

        switch (ctx.options.getSubcommand()) {
            case "add": {
                const user = ctx.options.getUser("user", true);
                const note = await DBManager.addNote(guildId, user.id, ctx.user.id, ctx.options.getString("text", true));
                return ctx.reply({ content: `📝 Note #${note.id} added for ${user.tag}.`, ephemeral: true });
            }
            case "list": {
                const user = ctx.options.getUser("user", true);
                const notes = await DBManager.listNotes(guildId, user.id);
                const embed = new VortexEmbed().setTitle(`Notes about ${user.tag}`).setThumbnail(user.displayAvatarURL());

                if (!notes.length) embed.setDescription("No notes yet.");
                for (const n of notes) embed.addField(`#${n.id} · ${time(n.createdAt, "d")}`, `${n.content}\n— <@${n.authorId}>`);

                return ctx.reply({ embeds: [embed], ephemeral: true });
            }
            case "remove": {
                const removed = await DBManager.removeNote(guildId, ctx.options.getInteger("id", true));
                return ctx.reply({ content: removed ? "Note deleted." : "There's no note with that number here.", ephemeral: true });
            }
        }
    }
}
