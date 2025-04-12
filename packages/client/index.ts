import "@sapphire/plugin-hmr/register";
import { GatewayIntentBits, Message } from "discord.js";
import { VortexClient } from "./lib/structures/client";
import { LogLevel } from "@sapphire/framework";
import { DBManager } from "./lib/database";

const client = new VortexClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    logger: {level: LogLevel.Debug},
    loadMessageCommandListeners: true,
    defaultPrefix: "=>",
    fetchPrefix: async (message: Message) => {
        return (await DBManager.getGuild(message.guildId!)).prefix;
    },
    shards: "auto",
    hmr: {enabled: true}
});

await client.login(Bun.env.DISCORD_TOKEN);