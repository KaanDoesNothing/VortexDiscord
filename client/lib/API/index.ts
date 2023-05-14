import {Application} from "oak/mod.ts";
import { oakCors } from "cors/mod.ts";
import { statisticsRouter } from "./routes/statistics.ts";
import { informationRouter } from "./routes/information.ts";
import { authRouter } from "./routes/auth.ts";

const app = new Application();
app.use(oakCors());

app.use(statisticsRouter.allowedMethods()).use(statisticsRouter.routes());
app.use(informationRouter.allowedMethods()).use(informationRouter.routes());
app.use(authRouter.allowedMethods()).use(authRouter.routes());

app.listen({port: 7805});