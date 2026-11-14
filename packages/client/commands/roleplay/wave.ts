import { RoleplayCommand } from "../../lib/structures/roleplay";

// /wave <member>: wave at someone, with a random GIF.
export class WaveCommand extends RoleplayCommand {
    protected readonly gif = "wave";
    public override applicationCommandData = this.define("wave", "Wave at someone");

    protected message(author: string, target: string) {
        return `${author} waved at ${target}`;
    }
}
