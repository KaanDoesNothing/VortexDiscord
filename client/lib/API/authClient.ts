import {config as env} from "dotenv/mod.ts";
import OAuthClient from "npm:disco-oauth";

const config = env();

export const authClient = new OAuthClient(config.CLIENT_ID, config.CLIENT_SECRET);
authClient.setScopes(["identify", "guilds"]);
authClient.setRedirect(config.REDIRECT);