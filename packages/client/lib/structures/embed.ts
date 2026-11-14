import { EmbedBuilder } from "discord.js";

// Brand colors shared by every embed, so the bot looks the same everywhere (and matches the dashboard).
export const Colors = {
    brand: 0x6d6af0,
    success: 0x30a46c,
    warning: 0xf5c542,
    danger: 0xe5484d,
    muted: 0x8e8c99
} as const;

// The bot's embed: brand color by default, plus a shorter addField helper.
export class VortexEmbed extends EmbedBuilder {
    constructor() {
        super();
        this.setColor(Colors.brand);
    }

    addField(name: string, value: string, inline = false) {
        this.addFields({ name, value, inline });
        return this;
    }
}
