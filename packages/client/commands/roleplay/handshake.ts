import { RoleplayCommand } from "../../lib/structures/roleplay";

// /handshake <member>: shake someone's hand, with a random GIF.
export class HandshakeCommand extends RoleplayCommand {
    protected readonly gif = "handshake";
    public override applicationCommandData = this.define("handshake", "Shake someone's hand");

    protected message(author: string, target: string) {
        return `${author} shook ${target}'s hand`;
    }
}
