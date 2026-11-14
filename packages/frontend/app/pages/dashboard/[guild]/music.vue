<!-- Music: a live player (now playing, controls, queue) and the server's music settings. -->
<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Music</h1>
            <p class="mt-1 text-sm text-zinc-400">Members play music with <code>/play</code>. Control what's playing here, and set the rules below.</p>
        </div>

        <!-- Status problems first: not configured / node offline. -->
        <div v-if="state && !state.configured" class="rounded-xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            <b>Music isn't set up on the bot.</b> Run a NodeLink server and set <code>NODELINK_HOST</code> / <code>NODELINK_PASSWORD</code> in the bot's <code>.env</code> (see the README).
        </div>
        <div v-else-if="state && !state.nodeOnline" class="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            The music server (NodeLink) is offline. Music commands won't work until it's back.
        </div>

        <!-- Live player -->
        <UiCard title="Now playing">
            <template #action>
                <span v-if="state?.active" class="text-xs text-zinc-500">🔊 {{ state.voiceChannelName ?? "voice" }} · updates live</span>
            </template>

            <p v-if="!state" class="h-20 animate-pulse rounded bg-zinc-900" />
            <p v-else-if="!state.active || !state.current" class="py-6 text-center text-sm text-zinc-500">Nothing is playing. Start something with <code>/play</code> in Discord.</p>

            <template v-else>
                <div class="flex flex-wrap items-center gap-4">
                    <img v-if="state.current.artworkUrl" :src="state.current.artworkUrl" alt="" class="h-20 w-20 rounded-lg object-cover" />
                    <div v-else class="flex h-20 w-20 items-center justify-center rounded-lg bg-zinc-800 text-3xl">🎵</div>
                    <div class="min-w-0 flex-1">
                        <a :href="state.current.uri ?? undefined" target="_blank" rel="noopener" class="block truncate text-lg font-semibold hover:underline">{{ state.current.title }}</a>
                        <div class="truncate text-sm text-zinc-400">{{ state.current.author }}<template v-if="state.current.requester"> · requested by {{ state.current.requester.username }}</template></div>
                    </div>
                </div>

                <!-- Progress (click to seek). -->
                <div>
                    <div
                        class="group relative h-2 rounded-full bg-zinc-800"
                        :class="{ 'cursor-pointer': !state.current.isStream }"
                        role="slider"
                        :aria-valuenow="Math.round(position / 1000)"
                        :aria-valuemax="Math.round(state.current.durationMs / 1000)"
                        aria-label="Song position"
                        @click="seekTo"
                    >
                        <div class="h-2 rounded-full bg-brand-500" :style="{ width: `${state.current.isStream ? 100 : Math.min(100, (position / Math.max(1, state.current.durationMs)) * 100)}%` }" />
                    </div>
                    <div class="mt-1 flex justify-between text-xs text-zinc-500 tabular-nums">
                        <span>{{ fmt(position) }}</span>
                        <span>{{ state.current.isStream ? "LIVE" : fmt(state.current.durationMs) }}</span>
                    </div>
                </div>

                <!-- Controls -->
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" class="btn-ghost px-3" title="Previous" :disabled="!state.previousCount || busy" @click="act('previous')">⏮️</button>
                    <button type="button" class="btn-primary px-4" :disabled="busy" @click="act(state.paused ? 'resume' : 'pause')">{{ state.paused ? "▶️ Resume" : "⏸️ Pause" }}</button>
                    <button type="button" class="btn-ghost px-3" title="Skip" :disabled="busy" @click="act('skip')">⏭️</button>
                    <button type="button" class="btn-danger px-3 py-2" :disabled="busy" @click="ask('Stop the music and leave voice?') && act('stop')">⏹️ Stop</button>

                    <select :value="state.repeatMode" class="input w-auto" aria-label="Loop" @change="act('loop', { mode: ($event.target as HTMLSelectElement).value })">
                        <option value="off">Loop: off</option>
                        <option value="track">Loop: song</option>
                        <option value="queue">Loop: queue</option>
                    </select>
                    <button type="button" class="btn-ghost px-3" :disabled="state.queueLength < 2 || busy" @click="act('shuffle')">🔀 Shuffle</button>
                    <label class="flex items-center gap-2 text-sm text-zinc-300">
                        <input type="checkbox" :checked="state.autoplay" class="accent-brand-500" @change="act('autoplay', { on: ($event.target as HTMLInputElement).checked })" />
                        Autoplay
                    </label>

                    <label class="ml-auto flex items-center gap-2 text-sm text-zinc-400">
                        🔊
                        <input type="range" min="0" :max="draft?.maxVolume ?? 150" :value="state.volume" class="w-32 accent-brand-500" aria-label="Volume" @change="act('volume', { volume: Number(($event.target as HTMLInputElement).value) })" />
                        <span class="w-10 tabular-nums">{{ state.volume }}%</span>
                    </label>
                </div>
            </template>
        </UiCard>

        <!-- Queue -->
        <UiCard v-if="state?.active" :title="`Up next (${state.queueLength})`" :description="state.queueLength ? `Total ${fmt(state.queueDurationMs)}` : undefined">
            <template #action>
                <button v-if="state.queueLength" type="button" class="btn-danger px-3 py-1 text-xs" @click="ask('Remove every upcoming song?') && act('clear')">Clear</button>
            </template>
            <p v-if="!state.queue.length" class="py-4 text-center text-sm text-zinc-500">The queue is empty.</p>
            <ol v-else class="-m-5 divide-y divide-zinc-800">
                <li v-for="t in state.queue" :key="`${t.index}-${t.title}`" class="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span class="w-6 text-right text-zinc-500 tabular-nums">{{ (t.index ?? 0) + 1 }}</span>
                    <img v-if="t.artworkUrl" :src="t.artworkUrl" alt="" class="h-9 w-9 rounded object-cover" loading="lazy" />
                    <div class="min-w-0 flex-1">
                        <div class="truncate">{{ t.title }}</div>
                        <div class="truncate text-xs text-zinc-500">{{ t.author }}<template v-if="t.requester"> · {{ t.requester.username }}</template></div>
                    </div>
                    <span class="text-xs text-zinc-500 tabular-nums">{{ t.isStream ? "LIVE" : fmt(t.durationMs) }}</span>
                    <button type="button" class="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30" title="Move up" :disabled="!t.index" @click="act('move', { from: t.index, to: (t.index ?? 0) - 1 })">▲</button>
                    <button type="button" class="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-300" title="Remove" @click="act('remove', { index: t.index })">✕</button>
                </li>
            </ol>
            <p v-if="state.queueLength > state.queue.length" class="pt-3 text-center text-xs text-zinc-500">…and {{ state.queueLength - state.queue.length }} more</p>
        </UiCard>

        <!-- Settings -->
        <template v-if="draft">
            <UiCard title="Settings">
                <UiToggle v-model="draft.enabled" label="Enable music" description="When off, music commands are disabled on this server." />

                <div class="space-y-5" :class="{ 'pointer-events-none opacity-50': !draft.enabled }">
                    <UiField label="DJ roles" hint="Only these roles (and members with Manage Server) can skip others' songs, stop, change volume, loop and apply effects. Leave empty to let everyone control the music. Someone alone with the bot can always control it.">
                        <UiMultiPicker v-model="draft.djRoleIds" :options="roleOptions" noun="role" :max="10" />
                    </UiField>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <UiField label="Default volume"><input v-model.number="draft.defaultVolume" type="number" min="1" max="150" class="input" /></UiField>
                        <UiField label="Maximum volume"><input v-model.number="draft.maxVolume" type="number" min="10" max="200" class="input" /></UiField>
                        <UiField label="Queue limit"><input v-model.number="draft.maxQueueSize" type="number" min="1" max="2000" class="input" /></UiField>
                        <UiField label="Songs per member" hint="0 = no limit"><input v-model.number="draft.maxQueuePerUser" type="number" min="0" max="1000" class="input" /></UiField>
                    </div>

                    <UiField label="Search on" hint="Where plain searches (not links) go. Spotify needs Spotify credentials in NodeLink's config.">
                        <select v-model="draft.searchSource" class="input sm:w-64">
                            <option value="ytsearch">YouTube</option>
                            <option value="ytmsearch">YouTube Music</option>
                            <option value="scsearch">SoundCloud</option>
                            <option value="spsearch">Spotify</option>
                        </select>
                    </UiField>

                    <UiToggle v-model="draft.announceNowPlaying" label="Post a &quot;Now playing&quot; card" description="With buttons to pause, skip, loop and change volume." />

                    <UiToggle v-model="draft.stay247" label="24/7 mode" description="Stay in voice even when the queue ends or everyone leaves." />
                    <div v-if="!draft.stay247" class="grid gap-4 sm:grid-cols-2">
                        <UiField label="Leave after the queue ends (seconds)" hint="0 = right away"><input v-model.number="draft.leaveAfterQueueEndSeconds" type="number" min="0" max="3600" class="input" /></UiField>
                        <UiField label="Leave when alone (seconds)" hint="Music pauses as soon as everyone leaves."><input v-model.number="draft.leaveWhenAloneSeconds" type="number" min="0" max="3600" class="input" /></UiField>
                    </div>
                </div>
            </UiCard>
            <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
        </template>
    </div>
</template>

<script setup lang="ts">
import type { MusicState } from "~/types/dashboard";

const { guildId, overview, draft, dirty, reset, saving, submit } = { ...useGuildDashboard(), ...useSettingsSection("music") };
const toast = useToast();

const { data: state, refresh } = await useFetch<MusicState>(() => `/api/guilds/${guildId.value}/music`, { server: false });

// Poll every 3 seconds while the page is open; between polls, advance the position locally.
const position = ref(0);
let lastSync = Date.now();
watch(state, (s) => {
    position.value = s?.active ? s.positionMs : 0;
    lastSync = Date.now();
});
let poll: ReturnType<typeof setInterval> | undefined;
let tick: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
    poll = setInterval(() => refresh(), 3000);
    tick = setInterval(() => {
        const s = state.value;
        if (s?.active && s.current && !s.paused && !s.current.isStream) {
            position.value = Math.min(s.current.durationMs, s.positionMs + (Date.now() - lastSync));
        }
    }, 500);
});
onBeforeUnmount(() => { clearInterval(poll); clearInterval(tick); });

// Browser confirm dialog (templates can't call window.confirm directly).
const ask = (question: string) => window.confirm(question);

const busy = ref(false);
async function act(action: string, extra: Record<string, unknown> = {}) {
    busy.value = true;
    try {
        const res = await api<{ message: string | null }>(`/guilds/${guildId.value}/music`, { method: "POST", body: { action, ...extra } });
        if (res.message && ["skip", "previous", "shuffle", "clear", "stop"].includes(action)) toast.show(res.message.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    } finally {
        busy.value = false;
    }
}

// Click on the progress bar → seek to that point.
function seekTo(e: MouseEvent) {
    const s = state.value;
    if (!s?.active || !s.current || s.current.isStream) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    act("seek", { positionMs: Math.round(ratio * s.current.durationMs) });
}

const fmt = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

const roleOptions = computed(() => (overview.value?.roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color === "#000000" ? undefined : r.color })));
</script>
