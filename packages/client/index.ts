// Entry point: sets up the database, the Discord client and the HTTP API the dashboard uses.
import "@sapphire/plugin-api/register";
import { LogLevel } from "@sapphire/framework";
import { GatewayIntentBits, OAuth2Scopes, Partials, type Message } from "discord.js";
import { DBManager, runMigrations } from "./lib/database";
import { VortexClient } from "./lib/structures/client";

// Create or update the Postgres tables before anything touches them.
await runMigrations();

// Where the dashboard runs. Used for CORS and the Discord login redirect.
const FRONTEND_URL = (Bun.env.FRONTEND_URL ?? "http://localhost:7807").replace(/\/$/, "");

// Prefix used in DMs and before a server has its own row.
const DEFAULT_PREFIX = "->";

// Welcome/goodbye messages and auto-roles need the privileged Server Members intent.
// It must also be switched on in the Developer Portal (Bot > Privileged Gateway Intents),
// otherwise Discord refuses the login, so it's opt-in.
const MEMBERS_INTENT = Bun.env.DISCORD_MEMBERS_INTENT === "true";

const client = new VortexClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        ...(MEMBERS_INTENT ? [GatewayIntentBits.GuildMembers] : [])
    ],
    // Reactions on messages sent before the bot started arrive as partials; without these
    // the like/dislike listeners would miss them.
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    logger: { level: Bun.env.NODE_ENV === "production" ? LogLevel.Info : LogLevel.Debug },
    loadMessageCommandListeners: true,
    defaultPrefix: DEFAULT_PREFIX,
    // Each server's prefix comes from the dashboard / ->prefix command (cached in DBManager).
    fetchPrefix: async (message: Message) => {
        if (!message.guildId) return DEFAULT_PREFIX;
        return (await DBManager.getGuildConfig(message.guildId)).prefix;
    },
    shards: "auto",
    api: {
        // Ports carried over from the old setup: API on 7805, frontend on 7807.
        listenOptions: { port: Number(Bun.env.API_PORT ?? 7805) },
        origin: FRONTEND_URL,
        // Dashboard login. Only enabled once the OAuth app details are in .env.
        auth: Bun.env.DISCORD_CLIENT_ID && Bun.env.DISCORD_CLIENT_SECRET ? {
            id: Bun.env.DISCORD_CLIENT_ID,
            secret: Bun.env.DISCORD_CLIENT_SECRET,
            cookie: "VORTEX_AUTH",
            scopes: [OAuth2Scopes.Identify, OAuth2Scopes.Guilds],
            redirect: `${FRONTEND_URL}/oauth/callback`
        } : undefined
    }
});

await client.login(Bun.env.DISCORD_TOKEN);
