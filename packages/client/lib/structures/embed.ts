import { EmbedBuilder } from "discord.js";

export class VortexEmbed extends EmbedBuilder {
    constructor() {
        super();
        this.setColor("Blue");
        this.setTimestamp();
    }

    addField(name: string, value: string, inline = false) {
        this.addFields({name, value, inline});
        
        return this;
    }
}