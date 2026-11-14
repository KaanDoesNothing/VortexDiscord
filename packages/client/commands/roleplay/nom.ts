import { RoleplayCommand } from "../../lib/structures/roleplay";

// /nom <member>: nom on someone, with a random GIF.
export class NomCommand extends RoleplayCommand {
    protected readonly gif = "nom";
    public override applicationCommandData = this.define("nom", "Nom on someone");

    protected message(author: string, target: string) {
        return `${author} is nomming on ${target}`;
    }
}
