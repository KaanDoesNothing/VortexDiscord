import { RoleplayCommand } from "../../lib/structures/roleplay";

// /tickle <member>: tickle someone, with a random GIF.
export class TickleCommand extends RoleplayCommand {
    protected readonly gif = "tickle";
    public override applicationCommandData = this.define("tickle", "Tickle someone");

    protected message(author: string, target: string) {
        return `${author} tickled ${target}`;
    }
}
