import { RoleplayCommand } from "../../lib/structures/roleplay";

// /poke <member>: poke someone to get their attention, with a random GIF.
export class PokeCommand extends RoleplayCommand {
    protected readonly gif = "poke";
    public override applicationCommandData = this.define("poke", "Poke someone to get their attention");

    protected message(author: string, target: string) {
        return `${author} poked ${target}`;
    }
}
