import OAuthClient from "disco-oauth";
import {VortexConfig} from "../../config";

export const authClient = new OAuthClient(VortexConfig.CLIENT_ID, VortexConfig.CLIENT_SECRET);
authClient.setScopes(["identify", "guilds"]);
authClient.setRedirect(VortexConfig.REDIRECT);