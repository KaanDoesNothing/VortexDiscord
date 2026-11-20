import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type GuildMember } from "discord.js";
import { Canvas } from "canvas-constructor/cairo";
import { Cooldowns } from "./cooldowns";
import type { GuildSettings } from "./settings";
import { VortexEmbed } from "./structures/embed";

// Member verification (Dashboard → Moderation → Verification): new members press Verify on a panel
// (posted with /verify panel) and get the verified role, optionally after solving an image captcha.
// Usually paired with the @everyone role not being able to see channels, so only verified members can.

type Verification = GuildSettings["verification"];

export function renderVerifyPanel(rules: Verification, guildId: string) {
    const embed = new VortexEmbed(guildId).setTitle("✅ Verification").setDescription(rules.panelMessage);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("verify:start").setLabel("Verify").setEmoji("✅").setStyle(ButtonStyle.Success)
    );
    return { embeds: [embed], components: [row] };
}

// Gives the verified role. Returns an error message, or null on success.
export async function grantVerified(member: GuildMember, rules: Verification): Promise<string | null> {
    if (!rules.roleId) return "Verification isn't set up yet (no role chosen). Ask an admin.";
    const role = member.guild.roles.cache.get(rules.roleId);
    if (!role || !role.editable || role.managed) return "I can't give the verified role (it's above my highest role). Ask an admin.";
    if (member.roles.cache.has(role.id)) return "You're already verified.";
    await member.roles.add(role, "Passed verification");
    return null;
}

// ---------- Captcha ----------

// Letters that are easy to tell apart (no 0/O, 1/I/l).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const pending = new Map<string, { code: string; expires: number }>();
// Limits how often someone can ask for a new captcha.
const attempts = new Cooldowns();

export function newCaptcha(guildId: string, userId: string) {
    const code = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
    pending.set(`${guildId}:${userId}`, { code, expires: Date.now() + 5 * 60_000 });
    // Drop expired codes now and then.
    if (pending.size > 1000) for (const [k, v] of pending) if (v.expires < Date.now()) pending.delete(k);
    return code;
}

export const canRequestCaptcha = (guildId: string, userId: string) => attempts.take(`${guildId}:${userId}`, 5_000);

// Checks an answer (case-insensitive). A code works once.
export function checkCaptcha(guildId: string, userId: string, answer: string) {
    const key = `${guildId}:${userId}`;
    const entry = pending.get(key);
    if (!entry || entry.expires < Date.now()) return "expired" as const;
    pending.delete(key);
    return entry.code === answer.trim().toUpperCase().replace(/\s+/g, "") ? "ok" as const : "wrong" as const;
}

// A noisy image of the code: each letter tilted and offset, with lines and dots over it.
export async function renderCaptcha(code: string) {
    const width = 360, height = 120;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    let canvas = new Canvas(width, height)
        .printLinearColorGradient(0, 0, width, height, [{ position: 0, color: "#1f1f2e" }, { position: 1, color: "#2d2b55" }]);

    for (let i = 0; i < 6; i++) {
        canvas = canvas.setStroke(`hsl(${rand(0, 360)}, 60%, 60%)`).setStrokeWidth(rand(1, 3))
            .beginPath().moveTo(rand(0, width), rand(0, height)).lineTo(rand(0, width), rand(0, height)).stroke();
    }

    [...code].forEach((char, i) => {
        canvas = canvas.save()
            .translate(35 + i * 52, 78 + rand(-12, 12))
            .rotate(rand(-0.45, 0.45))
            .setColor(`hsl(${rand(0, 360)}, 70%, 75%)`)
            .setTextFont(`bold ${Math.round(rand(44, 56))}px sans-serif`)
            .printText(char, 0, 0)
            .restore();
    });

    for (let i = 0; i < 120; i++) canvas = canvas.setColor(`rgba(255,255,255,${rand(0.1, 0.4)})`).printCircle(rand(0, width), rand(0, height), rand(0.5, 1.8));
    return canvas.pngAsync();
}
