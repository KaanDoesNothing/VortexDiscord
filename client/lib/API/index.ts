import {Application} from "oak/mod.ts";
import { oakCors } from "cors/mod.ts";
import { statisticsRouter } from "./routes/statistics.ts";
import { informationRouter } from "./routes/information.ts";
import { authRouter } from "./routes/auth.ts";
import { guildRouter } from "./routes/guild.ts";
import { User } from "harmony/mod.ts";
import logger from "https://deno.land/x/oak_logger/mod.ts";

declare module "oak/mod.ts" {
    interface Context {
        session: {
            user: User,
            key: string,
            guild: any;
        }
    }
}

const app = new Application();
app.use(oakCors());
app.use(logger.logger)
app.use(logger.responseTime)

app.use(statisticsRouter.allowedMethods()).use(statisticsRouter.routes());
app.use(informationRouter.allowedMethods()).use(informationRouter.routes());
app.use(authRouter.allowedMethods()).use(authRouter.routes());
app.use(guildRouter.allowedMethods()).use(guildRouter.routes());

app.listen({port: 7805});