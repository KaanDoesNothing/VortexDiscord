import {VortexEmbed} from "../Embed.ts";
import handlebars from "https://esm.sh/handlebars@4.7.7";

let embed: VortexEmbed;
const actions = [];

const data = await (new Promise((resolve, reject) => {
    self.onmessage = (e) => resolve(JSON.parse(e.data));
}));

handlebars.registerHelper("$", (varName, varValue, options) => {
    if (!options.data.root) {
        options.data.root = {};
    }
    options.data.root[varName] = varValue;
});

handlebars.registerHelper("useEmbed", () => {
    embed = new VortexEmbed();
});

handlebars.registerHelper("embedTitle", (title) => {
    embed.setTitle(title);
});

handlebars.registerHelper("embedColor", (color) => {
    embed.setColor(color);
});

handlebars.registerHelper("ifEquals", function (value1, value2, options) {
    if(value1 === value2) return options.fn(this);
    return options.inverse(this);
});

handlebars.registerHelper("ifNotEquals", function (value1, value2, options) {
    if(value1 !== value2) return options.fn(this);
    return options.inverse(this);
});

const template = handlebars.compile(data.template);

const result = template(data.templateData);
if(embed) {
    embed.setDescription(result);

    actions.push({
        type: "embed",
        content: embed
    })
}else {
    actions.push({
        type: "message",
        content: result
    });
}

self.postMessage(JSON.stringify({result, actions}));
