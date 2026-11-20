import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction, GuildMember } from "discord.js";
import type { Track } from "lavalink-client";
import * as Music from "../lib/music/actions";
import { checkDj, checkMusicAvailable, checkVoice, getActivePlayer } from "../lib/music/guards";
import { nowPlayingEmbed, controlRows, queueEmbed } from "../lib/music/ui";
import { MessageFlags } from "discord.js";

// Buttons under the now-playing card ("music:<action>"). Same rules as the slash commands:
// you must be in the bot's channel, and controlling other people's music needs DJ rights.
export class MusicButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
    }

    public override parse(interaction: ButtonInteraction) {
        const [kind, action] = interaction.customId.split(":");
        if (kind !== "music" || !action) return this.none();
        return this.some(action);
    }

    public async run(interaction: ButtonInteraction, action: string) {
        if (!interaction.inCachedGuild()) return;
        const fail = (content: string) => interaction.reply({ content, flags: MessageFlags.Ephemeral });

        const available = await checkMusicAvailable(interaction.guildId);
        if ("error" in available) return fail(available.error);

        const player = getActivePlayer(interaction.guildId);
        if (!player) {
            // The card is from a session that already ended: remove its buttons.
            await interaction.update({ components: [] }).catch(() => null);
            return;
        }

        // Anyone can look at the queue.
        if (action === "queue") return interaction.reply({ embeds: [queueEmbed(player, 1)], flags: MessageFlags.Ephemeral });

        const member = interaction.member as GuildMember;
        const voice = checkVoice(member, player);
        if ("error" in voice) return fail(voice.error);

        const djError = checkDj(member, available.settings, player, action === "skip");
        if (djError) return fail(djError);

        let message: string | null = null;
        switch (action) {
            case "pause":
            case "resume": message = await Music.togglePause(player); break;
            case "skip": message = await Music.skip(player); break;
            case "previous": message = await Music.previous(player); break;
            case "stop": message = await Music.stop(player); break;
            case "loop": message = await Music.setLoop(player); break;
            case "shuffle": message = await Music.shuffle(player); break;
            case "volup": message = await Music.setVolume(player, player.volume + 10); break;
            case "voldown": message = await Music.setVolume(player, player.volume - 10); break;
            default: return fail("Unknown button.");
        }

        // Refresh the card in place (pause icon, loop label, volume...) and confirm privately.
        const current = getActivePlayer(interaction.guildId);
        if (action === "stop" || !current?.queue.current) {
            await interaction.update({ components: [] }).catch(() => null);
        } else if (!["skip", "previous"].includes(action)) {
            await interaction.update({ embeds: [nowPlayingEmbed(current, current.queue.current as Track)], components: controlRows(current) }).catch(() => null);
        } else {
            await interaction.deferUpdate().catch(() => null);
        }
        await interaction.followUp({ content: `${message} · by ${member.displayName}`, allowedMentions: { parse: [] } }).catch(() => null);
    }
}
