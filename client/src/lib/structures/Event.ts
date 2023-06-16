import {VortexClient} from "../Client";

export class VortexEvent {
    public client: VortexClient;
    public type?: string;

    constructor(client: VortexClient) {
        this.client = client;
    }

    exec(ctx: any): void | Promise<void> {}
}