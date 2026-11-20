import { EmbedBuilder, MessageFlags } from "discord.js";
import { brandingFor } from "./context";

// Brand colors shared by every embed, so the bot looks the same everywhere (and matches the dashboard).
export const Colors = {
    brand: 0x6d6af0,
    success: 0x30a46c,
    warning: 0xf5c542,
    danger: 0xe5484d,
    muted: 0x8e8c99,
    orange: 0xf28c28
} as const;

// The bot's embed: the server's brand color and footer (Dashboard → General → Branding) when built
// while handling that server, otherwise Vortex purple. Plus a shorter addField helper.
export class VortexEmbed extends EmbedBuilder {
    constructor(guildId?: string | null) {
        super();
        const brand = brandingFor(guildId);
        this.setColor(brand?.color ?? Colors.brand);
        if (brand?.footer) this.setFooter({ text: brand.footer });
    }

    addField(name: string, value: string, inline = false) {
        this.addFields({ name, value, inline });
        return this;
    }
}

// Standard replies, so feedback looks the same in every command:
//   ctx.reply(ok("Saved")), ctx.reply(fail("You can't do that"))
// fail() is always private (only the user sees it, on slash commands and buttons); the others are
// private when asked: ok("Done", true).
const privately = (isPrivate: boolean) => (isPrivate ? { flags: MessageFlags.Ephemeral as const } : {});
export const ok = (text: string, isPrivate = false) => ({ embeds: [new VortexEmbed().setColor(Colors.success).setDescription(`✅ ${text}`)], ...privately(isPrivate) });
export const info = (text: string, isPrivate = false) => ({ embeds: [new VortexEmbed().setDescription(text)], ...privately(isPrivate) });
export const warn = (text: string, isPrivate = false) => ({ embeds: [new VortexEmbed().setColor(Colors.warning).setDescription(`⚠️ ${text}`)], ...privately(isPrivate) });
export const fail = (text: string) => ({ embeds: [new VortexEmbed().setColor(Colors.danger).setDescription(`❌ ${text}`)], flags: MessageFlags.Ephemeral as const });
