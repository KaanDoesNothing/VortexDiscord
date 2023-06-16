import {VortexCommand} from "../structures/Command";

export class usageParser {
    private cmd: VortexCommand;

    constructor(cmd: VortexCommand) {
        this.cmd = cmd;
    }

    exec() {
        // this.usage = {
            //         slash: `${this.config.name} ${this.config.options.map((option) => `[${option.name}]`).join(" ")}`,
            //         prefix: `${this.config.name} ` + this.config.options.map((option) => {
            //             if(option.type === ApplicationCommandOptionType.USER) {
            //                 return `--${option.name} @User`
            //             }else if(option.type === ApplicationCommandOptionType.STRING) {
            //                 return `--${option.name}="${option.choices ? option.choices.map(choice => choice.value).join(" | ") : "Text"}"`;
            //             }else if(option.type === ApplicationCommandOptionType.NUMBER) {
            //                 return `--${option.name} Number`;
            //             }
            //         }).join(" ")
            //     }

        return {
            slash: `${this.cmd.config.name} ${this.cmd.config.options.map((option: any) => `[${option.name}]`).join(" ")}`,
            prefix: `${this.cmd.config.name} ` + this.cmd.config.options.map((option: any) => {
                if(option.type === 6) {
                    return `--${option.name} @User`
                }else if(option.type === 3) {
                    return `--${option.name}="${option.choices ? option.choices.map(choice => choice.value).join(" | ") : "Text"}"`;
                }else if(option.type === 10) {
                    return `--${option.name} Number`;
                }
            }).join(" ")
        }
    }
}