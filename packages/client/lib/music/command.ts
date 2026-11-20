import { Command } from "@sapphire/framework";
import type { GuildMember } from "discord.js";
import type { Player } from "lavalink-client";
import { VortexCommand } from "../structures/command";
import { checkDj, checkMusicAvailable, checkVoice, getActivePlayer, type MusicSettings } from "./guards";
import { MessageFlags } from "discord.js";

interface Requirements {
    // There must be a song playing/queued.
    player?: boolean;
    // The member must be in the bot's voice channel.
    sameChannel?: boolean;
    // Only DJs (see guards.ts) may do this. "requester" also allows whoever queued the current song.
    dj?: boolean | "requester";
}

// Base class for music commands: runs the shared checks and replies with the reason if one fails.
export abstract class MusicCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, runIn: ["GUILD_ANY"] });
    }

    // Returns the player and settings, or null after replying with what's wrong.
    protected async prepare(ctx: Command.ChatInputCommandInteraction, req: Requirements = {}): Promise<{ player: Player; settings: MusicSettings; member: GuildMember } | null> {
        const fail = (content: string) => ctx.reply({ content, flags: MessageFlags.Ephemeral }).then(() => null);
        const member = ctx.member as GuildMember;

        const available = await checkMusicAvailable(ctx.guildId!);
        if ("error" in available) return fail(available.error);

        const player = getActivePlayer(ctx.guildId!);
        if (req.player !== false && !player) return fail("Nothing is playing right now. Start something with `/play`.");

        if (req.sameChannel !== false) {
            const voice = checkVoice(member, player ?? undefined);
            if ("error" in voice) return fail(voice.error);
        }

        if (req.dj) {
            const error = checkDj(member, available.settings, player ?? undefined, req.dj === "requester");
            if (error) return fail(error);
        }

        return { player: player!, settings: available.settings, member };
    }
}
