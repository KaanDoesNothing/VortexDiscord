<!-- Home: hero, live numbers, feature tour, command categories, how to get started. -->
<template>
    <div class="space-y-20">
        <!-- Hero -->
        <section class="relative flex flex-col items-center pt-10 text-center">
            <div class="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-72 max-w-2xl rounded-full bg-brand-500/20 blur-3xl" />
            <img v-if="client" :src="client.avatar" :alt="client.username" class="h-28 w-28 rounded-full shadow-2xl ring-4 ring-brand-500/40" />
            <div v-else class="h-28 w-28 rounded-full bg-zinc-800" />

            <h1 class="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
                {{ client?.username ?? "Vortex" }}
            </h1>
            <p class="mt-4 max-w-2xl text-lg text-zinc-400">
                The only bot your server needs: moderation, anti-raid, leveling, economy, tickets, feeds, music and more. Every part customizable from a simple web dashboard.
            </p>

            <div class="mt-8 flex flex-wrap justify-center gap-3">
                <a v-if="client" :href="inviteUrl" target="_blank" rel="noopener" class="btn-primary px-6 py-3 text-base">Add to Discord</a>
                <NuxtLink to="/dashboard" class="btn-ghost px-6 py-3 text-base">Open dashboard</NuxtLink>
            </div>

            <p v-if="clientError" class="mt-6 rounded-lg border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">
                Couldn't reach the bot right now. It may be restarting.
            </p>
        </section>

        <!-- Live numbers -->
        <section v-if="stats" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div v-for="stat in statCards" :key="stat.label" class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-center">
                <div class="text-3xl font-bold text-brand-400 tabular-nums">{{ stat.value }}</div>
                <div class="mt-1 text-sm text-zinc-400">{{ stat.label }}</div>
            </div>
        </section>

        <!-- Features -->
        <section>
            <h2 class="text-center text-3xl font-bold">Everything your server needs</h2>
            <p class="mx-auto mt-3 max-w-xl text-center text-zinc-400">Turn on what you want, turn off what you don't. Every feature is configurable per server.</p>

            <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div v-for="f in features" :key="f.title" class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700">
                    <div class="text-2xl" aria-hidden="true">{{ f.icon }}</div>
                    <h3 class="mt-3 font-semibold">{{ f.title }}</h3>
                    <p class="mt-1 text-sm text-zinc-400">{{ f.text }}</p>
                </div>
            </div>
        </section>

        <!-- Command categories -->
        <section v-if="categories.length">
            <h2 class="text-center text-3xl font-bold">{{ commands?.length }} commands</h2>
            <p class="mx-auto mt-3 max-w-xl text-center text-zinc-400">Use them as slash commands or with a prefix.</p>
            <div class="mt-8 flex flex-wrap justify-center gap-3">
                <NuxtLink v-for="c in categories" :key="c.name" :to="{ path: '/commands', query: { category: c.name } }" class="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm transition hover:border-brand-500 hover:text-brand-400">
                    {{ c.name }} <span class="text-zinc-500">{{ c.count }}</span>
                </NuxtLink>
            </div>
        </section>

        <!-- Getting started -->
        <section class="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-brand-600/10 p-8 sm:p-12">
            <h2 class="text-2xl font-bold">Get started in a minute</h2>
            <ol class="mt-6 grid gap-6 sm:grid-cols-3">
                <li v-for="(step, i) in steps" :key="step.title">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{{ i + 1 }}</div>
                    <h3 class="mt-3 font-semibold">{{ step.title }}</h3>
                    <p class="mt-1 text-sm text-zinc-400">{{ step.text }}</p>
                </li>
            </ol>
            <div class="mt-8 flex flex-wrap gap-3">
                <a v-if="client" :href="inviteUrl" target="_blank" rel="noopener" class="btn-primary">Add to Discord</a>
                <NuxtLink to="/stats" class="btn-ghost">See live stats</NuxtLink>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
const { data: client, error: clientError } = await useClientInfo();
const { data: stats } = await useStatistics();
const { data: commands } = await useCommands();

const inviteUrl = computed(() =>
    `https://discord.com/oauth2/authorize?client_id=${client.value?.id}&scope=bot+applications.commands&permissions=1409184820470`);

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const statCards = computed(() => stats.value ? [
    { label: "Servers", value: stats.value.guilds.toLocaleString() },
    { label: "Users", value: compact(stats.value.users) },
    { label: "Channels", value: compact(stats.value.channels) },
    { label: "Commands", value: stats.value.commands.toString() }
] : []);

const categories = computed(() => {
    const counts = new Map<string, number>();
    for (const c of commands.value ?? []) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
});

const features = [
    { icon: "🛡️", title: "Moderation", text: "Warn, timeout, kick, softban, massban, cases, notes and DMs to punished members, with a full log." },
    { icon: "🤖", title: "Auto-mod", text: "Phishing links, invites, spam, duplicates, caps, emoji spam, zalgo and bad words, each with its own punishment." },
    { icon: "🚨", title: "Anti-raid & verification", text: "Automatic lockdowns during join floods, minimum account age, and button or captcha verification." },
    { icon: "📈", title: "XP leveling", text: "XP for chatting and voice, role and channel multipliers, role rewards, custom rank cards and a public leaderboard." },
    { icon: "💰", title: "Economy & shop", text: "Shared or per-server economy with tunable payouts, a role & item shop, inventories and casino games." },
    { icon: "👋", title: "Welcome & roles", text: "Welcome cards and embeds, welcome DMs, auto-roles, button/menu role panels and reaction roles." },
    { icon: "🎫", title: "Tickets", text: "Ticket types with forms, claiming, and HTML transcripts. Plus suggestions, polls and giveaways." },
    { icon: "📺", title: "Social feeds", text: "Post new YouTube videos, Twitch streams, Reddit posts and RSS items automatically." },
    { icon: "🔊", title: "Voice & channels", text: "Join-to-create voice channels, live stats channels, sticky messages and autoresponders." },
    { icon: "🎵", title: "Music", text: "Play from YouTube, Spotify and SoundCloud with filters, autoplay, lyrics and a 24/7 mode." },
    { icon: "📝", title: "Logs", text: "Messages, members, roles, voice, server changes, bans and invites, each to its own channel." },
    { icon: "🧭", title: "Web dashboard", text: "Configure everything in your browser, brand the bot with your colors, and copy setups between servers." }
];

const steps = [
    { title: "Add the bot", text: "Invite it to your server with one click." },
    { title: "Open the dashboard", text: "Log in with Discord and pick your server." },
    { title: "Pick a preset", text: "Run /setup, then fine-tune anything in the dashboard." }
];
</script>
