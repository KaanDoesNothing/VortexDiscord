import { RoleplayCommand } from "../../lib/structures/roleplay";

// /highfive <member>: give someone a high five, with a random GIF.
export class HighfiveCommand extends RoleplayCommand {
    protected readonly gif = "highfive";
    public override applicationCommandData = this.define("highfive", "Give someone a high five");

    protected message(author: string, target: string) {
        return `${author} high-fived ${target}`;
    }
}
