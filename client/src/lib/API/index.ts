import express from "express";
import cors from "cors";
import morgan from "morgan";
import {informationRouter} from "./routes/information";
import {authRouter} from "./routes/authentication";

export const webserver = express();
webserver.use(morgan());
webserver.use(cors());

webserver.use("/information", informationRouter);
webserver.use("/authentication", authRouter);

webserver.get("/", (req, res) => {
    return res.json({message: "Woah!"});
});