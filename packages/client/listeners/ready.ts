import { Events, Listener } from "@sapphire/framework";
import type { Client } from "discord.js";
import { ensureBirthdaySweep } from "../lib/engagement";
import { applyPresence, isBlacklisted, loadBlacklist, loadDisabledCommands, loadOwners, loadPresence } from "../lib/owner";
import { startScheduler } from "../lib/scheduler";

// Make sure every scheduled-task handler is registered before the scheduler starts.
import "../lib/modlog";
import "../lib/utility";

// Startup: load owner settings, start the scheduler, set the status, and leave blacklisted servers.
export class ReadyListener extends Listener<typeof Events.ClientReady> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, once: true, event: Events.ClientReady });
    }

    public async run(client: Client<true>) {
        const { logger, stores } = this.container;

        await Promise.all([loadOwners(), loadBlacklist(), loadDisabledCommands()]);
        await loadPresence();

        // Leave any servers that were blacklisted while the bot was offline.
        for (const guild of client.guilds.cache.values()) {
            if (isBlacklisted(guild.id)) await guild.leave().catch(() => null);
        }

        startScheduler();
        await ensureBirthdaySweep().catch((error) => logger.warn("Couldn't schedule the birthday sweep:", error));

        logger.info(`Logged in as ${client.user.tag}: ${client.guilds.cache.size} servers, ${stores.get("commands").size} commands, ${client.ws.shards.size} shard(s).`);

        // Refresh the status every 10 minutes so live counts stay current.
        setInterval(applyPresence, 10 * 60 * 1000).unref();
    }
}
