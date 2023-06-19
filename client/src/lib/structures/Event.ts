import {VortexClient} from "../Client";
import {BaseClass} from "./base";

export class VortexEvent extends BaseClass {
    public type?: string;
    exec(ctx: any): void | Promise<void> {}
}