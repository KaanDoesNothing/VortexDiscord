import { Embed } from "harmony/mod.ts";

export class VortexEmbed extends Embed {
    constructor() {
        super();
        this.setColor("BLUE");
    }
}

export const VortexRolePlayEmbed = (author: string, target: string, type: string, url: string) => {
    const embed = new VortexEmbed()
        .setTitle(`${target} has been ${type} by ${author}`)
        .setImage(url);

    return embed;
}