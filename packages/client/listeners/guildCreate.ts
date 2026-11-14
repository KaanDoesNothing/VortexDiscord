import { Events, Listener } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { applyPresence, isBlacklisted } from "../lib/owner";

// Joined a new server: leave immediately if it (or its owner) is blacklisted, otherwise refresh the status count.
export class GuildCreateListener extends Listener<typeof Events.GuildCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.GuildCreate });
    }

    public async run(guild: Guild) {
        if (isBlacklisted(guild.id, guild.ownerId)) {
            this.container.logger.info(`Left blacklisted server ${guild.name} (${guild.id}).`);
            await guild.leave().catch(() => null);
            return;
        }
        applyPresence();
    }
}
