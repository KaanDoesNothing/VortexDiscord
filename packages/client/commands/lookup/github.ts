import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time, MessageFlags } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Repo { full_name: string; html_url: string; description: string | null; stargazers_count: number; forks_count: number; open_issues_count: number; language: string | null; license: { spdx_id: string } | null; pushed_at: string; owner: { avatar_url: string }; topics?: string[] }
interface User { login: string; html_url: string; name: string | null; bio: string | null; avatar_url: string; public_repos: number; followers: number; following: number; created_at: string; blog: string | null; type: string }

// /github <user or owner/repo>: info about a GitHub repository or user.
export class GithubCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["gh"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("github")
        .setDescription("Look up a GitHub repository (owner/repo) or user")
        .addStringOption((o) => o.setName("query").setDescription("e.g. discordjs/discord.js or torvalds").setMaxLength(100).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        // Accept full URLs too.
        const query = ctx.options.getString("query", true).trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
        if (!/^[\w.-]+(\/[\w.-]+)?$/.test(query)) return ctx.reply({ content: "Use `owner/repo` or a username.", flags: MessageFlags.Ephemeral });
        await ctx.deferReply();

        try {
            const headers = { accept: "application/vnd.github+json" };

            if (query.includes("/")) {
                const r = await getJson<Repo>(`https://api.github.com/repos/${query}`, { cacheMs: 600_000, headers });
                const embed = new VortexEmbed()
                    .setTitle(r.full_name)
                    .setURL(r.html_url)
                    .setThumbnail(r.owner.avatar_url)
                    .setDescription(r.description ?? "No description.")
                    .addField("⭐ Stars", r.stargazers_count.toLocaleString(), true)
                    .addField("🍴 Forks", r.forks_count.toLocaleString(), true)
                    .addField("🐛 Open issues", r.open_issues_count.toLocaleString(), true)
                    .addField("Language", r.language ?? "—", true)
                    .addField("License", r.license?.spdx_id ?? "None", true)
                    .addField("Last push", time(new Date(r.pushed_at), "R"), true);
                if (r.topics?.length) embed.setFooter({ text: r.topics.slice(0, 8).join(" · ") });
                return ctx.editReply({ embeds: [embed] });
            }

            const u = await getJson<User>(`https://api.github.com/users/${query}`, { cacheMs: 600_000, headers });
            const embed = new VortexEmbed()
                .setTitle(u.name ? `${u.name} (@${u.login})` : `@${u.login}`)
                .setURL(u.html_url)
                .setThumbnail(u.avatar_url)
                .setDescription(u.bio ?? null)
                .addField("Repositories", u.public_repos.toLocaleString(), true)
                .addField("Followers", u.followers.toLocaleString(), true)
                .addField("Following", u.following.toLocaleString(), true)
                .addField("Joined", time(new Date(u.created_at), "D"), true);
            if (u.blog) embed.addField("Website", u.blog, true);
            if (u.type === "Organization") embed.setFooter({ text: "Organization" });
            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error).replace("Nothing found.", `Nothing found on GitHub for "${query}".`));
        }
    }
}
