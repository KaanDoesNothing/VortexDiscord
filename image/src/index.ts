import express from "express";
import {Canvas, loadImage} from "canvas-constructor/napi-rs";
import fs from "fs/promises";
import Axios from "axios";

const app = express();
app.use(express.json({}));
app.use(express.urlencoded());

app.get("/profile", async (req, res) => {
    const template = await loadImage("./static/profile.png");
    const avatar = await loadImage(`https://cdn.discordapp.com/avatars/${req.query.user_id as string}/${req.query.avatar as string}.png?size=1024`);
    // const fetchedAvatar = await Axios.get(`https://cdn.discordapp.com/avatars/${req.query.user_id as string}/${req.query.avatar as string}.png?size=512`, {responseType: "blob"});
    // const avatar = await loadImage(fetchedAvatar.data);
    
    const canvas = new Canvas(1000, 1000)
        .printImage(template, 0, 0)
        .printImage(avatar, 63, 207, 340 - 63, 484 - 207)
        .setTextSize(28)
        .setTextAlign("left")
        // .setTextFont("Ariel")
        .setColor("#FFFFFF")
        .printText(req.query.username as string, 430, 373)
        .png();

    res.end(canvas);
});

app.listen(7806, () => console.log("Running"));