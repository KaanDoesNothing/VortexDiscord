import {VortexClient} from "../Client";

export class BaseClass {
    public client: VortexClient;

    setClient(client: VortexClient) {
        this.client = client;

        return this;
    }
}