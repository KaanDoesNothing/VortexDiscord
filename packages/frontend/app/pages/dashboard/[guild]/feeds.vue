<!-- Social feeds: new YouTube videos, Twitch streams, Reddit posts and RSS items posted to a channel. -->
<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Social feeds</h1>
            <p class="mt-1 text-sm text-zinc-400">Post new videos, streams and posts automatically. Checked every 5 minutes. {{ data?.feeds.length ?? 0 }}/15 used.</p>
        </div>

        <UiCard title="Follow something new">
            <div class="grid gap-2 sm:grid-cols-4">
                <label v-for="t in types" :key="t.value" class="cursor-pointer rounded-lg border p-3 text-sm" :class="[form.type === t.value ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700', t.value === 'twitch' && !data?.twitch ? 'pointer-events-none opacity-40' : '']">
                    <input v-model="form.type" type="radio" :value="t.value" class="sr-only" />
                    <span class="block font-medium">{{ t.icon }} {{ t.label }}</span>
                    <span class="mt-0.5 block text-xs text-zinc-400">{{ t.value === "twitch" && !data?.twitch ? "Needs Twitch keys in the bot's .env" : t.hint }}</span>
                </label>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                <UiField :label="types.find((t) => t.value === form.type)!.sourceLabel"><input v-model="form.source" class="input" :placeholder="types.find((t) => t.value === form.type)!.placeholder" /></UiField>
                <UiField label="Post in"><UiChannelSelect v-model="form.channelId" :channels="overview!.channels" placeholder="Pick a channel…" /></UiField>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                <UiField label="Ping role" hint="Optional"><UiRoleSelect v-model="form.pingRoleId" :roles="overview!.roles" placeholder="No ping" /></UiField>
                <UiField label="Custom message" hint="Optional. {title}, {url} and {author} work."><input v-model="form.message" maxlength="1000" class="input" /></UiField>
            </div>
            <div class="flex justify-end">
                <button type="button" class="btn-primary" :disabled="!form.source || !form.channelId || adding" @click="add">{{ adding ? "Checking…" : "Follow" }}</button>
            </div>
        </UiCard>

        <ul v-if="data?.feeds.length" class="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
            <li v-for="f in data.feeds" :key="f.id" class="flex flex-wrap items-center gap-4 bg-zinc-900/60 px-4 py-3 text-sm">
                <span class="text-lg">{{ types.find((t) => t.value === f.type)?.icon }}</span>
                <div class="min-w-0 flex-1">
                    <div class="font-semibold">{{ f.label }}</div>
                    <div class="text-zinc-400">→ #{{ channelName(f.channelId) ?? "deleted channel" }}<span v-if="f.failures > 3" class="ml-2 text-amber-300">⚠️ failing to load</span></div>
                </div>
                <button type="button" class="btn-danger" @click="remove(f)">Unfollow</button>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import type { Feed } from "~/types/dashboard";

const { guildId, overview, channelName } = useGuildDashboard();
const toast = useToast();
const { data, refresh } = await useFetch<{ twitch: boolean; feeds: Feed[] }>(() => `/api/guilds/${guildId.value}/feeds`, { server: false });

const types = [
    { value: "youtube", icon: "📺", label: "YouTube", hint: "New uploads", sourceLabel: "Channel", placeholder: "@handle, channel link or UC… ID" },
    { value: "twitch", icon: "🟣", label: "Twitch", hint: "Going live", sourceLabel: "Streamer", placeholder: "username or twitch.tv link" },
    { value: "reddit", icon: "🟠", label: "Reddit", hint: "New posts", sourceLabel: "Subreddit", placeholder: "r/aww" },
    { value: "rss", icon: "📰", label: "RSS / Atom", hint: "Blogs, news, anything", sourceLabel: "Feed link", placeholder: "https://…/feed.xml" }
] as const;

const form = reactive({ type: "youtube" as Feed["type"], source: "", channelId: null as string | null, pingRoleId: null as string | null, message: "" });
const adding = ref(false);

async function add() {
    adding.value = true;
    try {
        await api(`/guilds/${guildId.value}/feeds`, { method: "POST", body: form });
        toast.show("Following!");
        form.source = "";
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    } finally {
        adding.value = false;
    }
}

async function remove(f: Feed) {
    if (!confirm(`Stop following ${f.label}?`)) return;
    try {
        await api(`/guilds/${guildId.value}/feeds/${f.id}`, { method: "DELETE" });
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}
</script>
