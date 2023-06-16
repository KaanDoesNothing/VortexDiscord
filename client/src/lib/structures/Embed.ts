import {EmbedBuilder} from "discord.js";

export class VortexEmbed extends EmbedBuilder {
    constructor() {
        super();
        this.setColor("Blue");
    }

    addField(name: string, value: string, inline = false) {
        this.addFields({name, value, inline});
        return this;
    }
}

export const VortexRolePlayEmbed = (author: string, target: string, type: string, url: string) => {
    const embed = new VortexEmbed()
        .setTitle(`${target} has been ${type} by ${author}`)
        .setImage(url);

    return embed;
}