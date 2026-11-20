import { Canvas, loadImage, type Image } from "canvas-constructor/cairo";
import { join } from "node:path";
import type { User } from "discord.js";

// Image templates live in packages/client/assets/img. Resolved from this file, so it works
// no matter which directory the bot is started from.
const ASSETS = join(import.meta.dir, "..", "assets", "img");

// Templates are loaded once and reused.
const cache = new Map<string, Promise<Image>>();
const template = (file: string) => {
    if (!cache.has(file)) cache.set(file, loadImage(join(ASSETS, file)));
    return cache.get(file)!;
};

// Draw order: avatar under or over the template.
type Layer = { kind: "avatar" | "template"; x: number; y: number; width: number; height: number };

export interface MemeTemplate {
    file: string;
    width: number;
    height: number;
    layers: Layer[];
}

// Composes a user's avatar with a template image and returns PNG bytes.
export async function renderAvatarMeme(user: User, meme: MemeTemplate) {
    // displayAvatarURL also covers users with a default avatar (avatarURL() is null for them).
    const [avatar, background] = await Promise.all([
        loadImage(user.displayAvatarURL({ size: 1024, extension: "png", forceStatic: true })),
        template(meme.file)
    ]);

    let canvas = new Canvas(meme.width, meme.height);
    for (const layer of meme.layers) {
        canvas = canvas.printImage(layer.kind === "avatar" ? avatar : background, layer.x, layer.y, layer.width, layer.height);
    }

    return canvas.pngAsync();
}

// ---------- Generated cards ----------

const FONT = "sans-serif";
const avatarOf = (user: User) => loadImage(user.displayAvatarURL({ size: 256, extension: "png", forceStatic: true }));

// Shared dark background with a soft brand-colored glow.
function cardBackground(width: number, height: number) {
    return new Canvas(width, height)
        .printLinearColorGradient(0, 0, width, height, [{ position: 0, color: "#18181b" }, { position: 1, color: "#27264a" }])
        .printRoundedRectangle(0, 0, width, height, 24);
}

// Welcome image attached to welcome messages (dashboard: Welcome & roles → "Attach welcome card").
export async function renderWelcomeCard(user: User, serverName: string, memberCount: number) {
    const avatar = await avatarOf(user);
    const name = user.displayName.length > 22 ? `${user.displayName.slice(0, 21)}…` : user.displayName;

    return cardBackground(1000, 300)
        // Avatar with a ring.
        .setColor("#6d6af0").printCircle(150, 150, 106)
        .printCircularImage(avatar, 150, 150, 100)
        .setTextAlign("left")
        .setColor("#a1a1aa").setTextFont(`bold 28px ${FONT}`).printText("WELCOME", 290, 105)
        .setColor("#fafafa").setTextFont(`bold 56px ${FONT}`).printText(name, 290, 170, 680)
        .setColor("#a1a1aa").setTextFont(`28px ${FONT}`).printText(`to ${serverName.slice(0, 40)} · member #${memberCount.toLocaleString("en-US")}`, 290, 222, 680)
        .pngAsync();
}

// /rank card: avatar, level, rank and a progress bar to the next level. The accent color and
// background image come from the server's settings (Dashboard → Leveling → Rank card).
export async function renderRankCard(input: { user: User; level: number; rank: number | null; progress: number; current: number; needed: number; accent?: string; backgroundUrl?: string }) {
    const accent = input.accent || "#7c7af5";
    const [avatar, background] = await Promise.all([
        avatarOf(input.user),
        input.backgroundUrl ? loadImage(input.backgroundUrl).catch(() => null) : null
    ]);
    const name = input.user.displayName.length > 20 ? `${input.user.displayName.slice(0, 19)}…` : input.user.displayName;
    const barX = 290, barY = 200, barW = 660, barH = 36;
    const filled = Math.max(barH, Math.round(barW * Math.min(1, Math.max(0, input.progress))));

    let canvas = cardBackground(1000, 300);
    // Custom background, darkened so the text stays readable.
    if (background) canvas = canvas.printImage(background, 0, 0, 1000, 300).setColor("rgba(9, 9, 11, 0.55)").printRectangle(0, 0, 1000, 300);

    return canvas
        .setColor(accent).printCircle(150, 150, 106)
        .printCircularImage(avatar, 150, 150, 100)
        .setTextAlign("left")
        .setColor("#fafafa").setTextFont(`bold 44px ${FONT}`).printText(name, barX, 178, barW)
        .setTextAlign("right")
        .setColor("#a1a1aa").setTextFont(`28px ${FONT}`).printText(input.rank ? `RANK #${input.rank}` : "", 950, 70)
        .setColor(accent).setTextFont(`bold 44px ${FONT}`).printText(`LEVEL ${input.level}`, 950, 118)
        // Progress bar track and fill.
        .setColor("#3f3f46").printRoundedRectangle(barX, barY, barW, barH, barH / 2)
        .setColor(accent).printRoundedRectangle(barX, barY, filled, barH, barH / 2)
        .setColor("#a1a1aa").setTextFont(`24px ${FONT}`).printText(`${input.current.toLocaleString("en-US")} / ${input.needed.toLocaleString("en-US")} XP`, 950, 270)
        .pngAsync();
}
