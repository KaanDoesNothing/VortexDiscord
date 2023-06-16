import {GatewayIntentBits, REST} from "discord.js";
import {VortexClient} from "./lib/Client";
import {VortexConfig} from "./config";
import {initDatabase} from "./lib/Database";
import {webserver} from "./lib/API";

export const client = new VortexClient();
export const rest = new REST().setToken(VortexConfig.DISCORD_TOKEN);

const main = async () => {
    await initDatabase();

    await client.login();
    console.log("Client Started!");
}

webserver.listen(7805);

main();