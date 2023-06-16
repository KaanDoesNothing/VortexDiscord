import dotenv from "dotenv";
export const VortexConfig = dotenv.config().parsed as {
    DISCORD_TOKEN: string;
    MONGODB: string;
    DATABASE: string;
    PREFIX: string;
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    REDIRECT: string;
    LAVALINK_NAME: string;
    LAVALINK_URL: string;
    LAVALINK_AUTH: string;
};