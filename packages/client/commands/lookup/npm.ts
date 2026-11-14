import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Packument { name: string; description?: string; "dist-tags": Record<string, string>; time: Record<string, string>; license?: string; homepage?: string; repository?: { url?: string }; keywords?: string[]; maintainers?: { name: string }[] }
interface Downloads { downloads: number }

// /npm <package>: npm package info and weekly downloads.
export class NpmCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("npm")
        .setDescription("Look up a JavaScript package on npm")
        .addStringOption((o) => o.setName("package").setDescription("Package name, e.g. discord.js").setMaxLength(214).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const name = ctx.options.getString("package", true).trim().toLowerCase();
        if (!/^(@[\w.-]+\/)?[\w.-]+$/.test(name)) return ctx.reply({ content: "That isn't a valid npm package name.", ephemeral: true });
        await ctx.deferReply();

        try {
            const encoded = name.replace("/", "%2F");
            const [pkg, dl] = await Promise.all([
                getJson<Packument>(`https://registry.npmjs.org/${encoded}`, { cacheMs: 600_000 }),
                getJson<Downloads>(`https://api.npmjs.org/downloads/point/last-week/${name}`, { cacheMs: 3_600_000 }).catch(() => null)
            ]);

            const latest = pkg["dist-tags"].latest ?? "?";
            const embed = new VortexEmbed()
                .setTitle(`📦 ${pkg.name}`)
                .setURL(`https://www.npmjs.com/package/${pkg.name}`)
                .setDescription(pkg.description ?? "No description.")
                .addField("Latest", `\`${latest}\``, true)
                .addField("Weekly downloads", dl ? dl.downloads.toLocaleString() : "—", true)
                .addField("License", pkg.license ?? "—", true);

            if (pkg.time[latest]) embed.addField("Published", time(new Date(pkg.time[latest]!), "R"), true);
            if (pkg.maintainers?.length) embed.addField("Maintainers", pkg.maintainers.slice(0, 5).map((m) => m.name).join(", "), true);
            if (pkg.keywords?.length) embed.setFooter({ text: pkg.keywords.slice(0, 8).join(" · ") });

            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error).replace("Nothing found.", `No npm package called "${name}".`));
        }
    }
}
