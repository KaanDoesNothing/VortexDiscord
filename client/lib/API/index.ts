import {Application} from "oak/mod.ts";
import { statisticsRouter } from "./routes/statistics.ts";
import { informationRouter } from "./routes/information.ts";

const app = new Application();

app.use(statisticsRouter.allowedMethods()).use(statisticsRouter.routes());
app.use(informationRouter.allowedMethods()).use(informationRouter.routes());

app.listen({port: 7805});