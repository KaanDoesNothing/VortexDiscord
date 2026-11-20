<!-- Leveling: XP per message and in voice, multipliers, level-up messages, role rewards, rank card, public leaderboard. -->
<template>
    <div v-if="draft" class="space-y-6">
        <h1 class="text-2xl font-bold">Leveling</h1>

        <UiCard title="XP" description="Members earn XP by chatting (and optionally in voice) and level up as it adds up.">
            <UiToggle v-model="draft.enabled" label="Enable leveling" description="When off, nobody earns XP or levels up." />

            <div class="space-y-5" :class="{ 'pointer-events-none opacity-50': !draft.enabled }">
                <div class="grid gap-5 sm:grid-cols-3">
                    <UiField label="XP per message (min)"><input v-model.number="draft.xpMin" type="number" min="0" max="1000" class="input" /></UiField>
                    <UiField label="XP per message (max)"><input v-model.number="draft.xpMax" type="number" min="0" max="1000" class="input" /></UiField>
                    <UiField label="Cooldown (seconds)" hint="Messages faster than this earn nothing."><input v-model.number="draft.cooldownSeconds" type="number" min="0" max="3600" class="input" /></UiField>
                </div>
                <UiField label="Difficulty" :hint="`Level 10 needs ${xpFor(10).toLocaleString()} XP, level 50 needs ${xpFor(50).toLocaleString()} XP (about ${messagesFor(10).toLocaleString()} and ${messagesFor(50).toLocaleString()} messages).`">
                    <div class="flex items-center gap-3">
                        <input v-model.number="draft.difficulty" type="range" min="25" max="400" step="25" class="flex-1" />
                        <span class="w-14 text-right text-sm text-zinc-300">{{ draft.difficulty }}%</span>
                    </div>
                </UiField>

                <div class="grid gap-5 sm:grid-cols-2">
                    <UiField label="Ignored channels" hint="Messages here never earn XP.">
                        <UiMultiPicker v-model="draft.ignoredChannelIds" :options="channelOptions" noun="channel" />
                    </UiField>
                    <UiField label="No-XP roles" hint="Members with these roles never earn XP.">
                        <UiMultiPicker v-model="draft.noXpRoleIds" :options="roleOptions" noun="role" :max="25" />
                    </UiField>
                </div>
            </div>
        </UiCard>

        <UiCard title="Multipliers" description="Boost (or reduce) XP for roles and channels. 150% = 1.5× XP. The best role multiplier applies, times the channel's." :class="{ 'opacity-50': !draft.enabled }">
            <div v-for="(m, i) in draft.roleMultipliers" :key="`r${i}`" class="flex items-center gap-2 text-sm">
                <UiRoleSelect v-model="m.roleId as string | null" :roles="overview!.roles" class="flex-1" />
                <input v-model.number="m.percent" type="number" min="0" max="1000" class="input w-24" /> %
                <button type="button" class="btn-danger" @click="draft.roleMultipliers.splice(i, 1)">Remove</button>
            </div>
            <div v-for="(m, i) in draft.channelMultipliers" :key="`c${i}`" class="flex items-center gap-2 text-sm">
                <UiChannelSelect v-model="m.channelId as string | null" :channels="overview!.channels" class="flex-1" />
                <input v-model.number="m.percent" type="number" min="0" max="1000" class="input w-24" /> %
                <button type="button" class="btn-danger" @click="draft.channelMultipliers.splice(i, 1)">Remove</button>
            </div>
            <div class="flex gap-2">
                <button v-if="draft.roleMultipliers.length < 25" type="button" class="btn-ghost" @click="draft.roleMultipliers.push({ roleId: '', percent: 150 })">+ Role multiplier</button>
                <button v-if="draft.channelMultipliers.length < 50" type="button" class="btn-ghost" @click="draft.channelMultipliers.push({ channelId: '', percent: 150 })">+ Channel multiplier</button>
            </div>
        </UiCard>

        <UiCard title="Voice XP" description="XP for every minute in a voice channel (not the AFK channel)." :class="{ 'opacity-50': !draft.enabled }">
            <UiToggle v-model="draft.voice.enabled" label="Give XP in voice" />
            <template v-if="draft.voice.enabled">
                <UiField label="XP per minute"><input v-model.number="draft.voice.xpPerMinute" type="number" min="1" max="500" class="input sm:w-32" /></UiField>
                <UiToggle v-model="draft.voice.requireOthers" label="Only when someone else is there" description="Stops people farming XP alone in a channel." />
                <UiToggle v-model="draft.voice.ignoreMuted" label="Not while muted or deafened" />
            </template>
        </UiCard>

        <UiCard title="Level-up messages" :class="{ 'opacity-50': !draft.enabled }">
            <UiToggle v-model="draft.announce" label="Announce level-ups" :disabled="!draft.enabled" />
            <template v-if="draft.announce">
                <UiToggle v-model="draft.announceDm" label="Send as a DM instead" />
                <UiField v-if="!draft.announceDm" label="Channel" hint="Leave empty to post where they leveled up. Voice level-ups need a channel here.">
                    <UiChannelSelect v-model="draft.announceChannelId" :channels="overview!.channels" placeholder="Same channel as the message" />
                </UiField>
                <UiRichMessageEditor v-model="draft.message" :placeholders="overview!.placeholders" :only="['{user}', '{user.name}', '{user.mention}', '{user.avatar}', '{server}', '{level}', '{xp}', '{channel}', '{random:a|b|c}']" />
            </template>
        </UiCard>

        <UiCard title="Role rewards" description="Give roles automatically when members reach a level." :class="{ 'opacity-50': !draft.enabled }">
            <div v-for="(reward, i) in sortedRewards" :key="i" class="flex items-center gap-2 text-sm">
                Level
                <input v-model.number="reward.level" type="number" min="1" max="10000" class="input w-24" />
                →
                <UiRoleSelect v-model="reward.roleId as string | null" :roles="overview!.roles" assignable-only class="flex-1" />
                <button type="button" class="btn-danger" @click="draft.rewards.splice(draft.rewards.indexOf(reward), 1)">Remove</button>
            </div>
            <button v-if="draft.rewards.length < 25" type="button" class="btn-ghost" @click="draft.rewards.push({ level: (draft.rewards.at(-1)?.level ?? 0) + 5, roleId: '' })">+ Add reward</button>
            <UiToggle v-model="draft.stackRewards" label="Keep earlier reward roles" description="Off: members only keep their highest reward role." />
        </UiCard>

        <UiCard v-if="draft.card" title="Rank card" description="How /rank looks on this server.">
            <div class="grid gap-4 sm:grid-cols-[auto_1fr]">
                <UiField label="Accent color"><input v-model="draft.card.accentColor" type="color" class="h-10 w-16 cursor-pointer rounded border border-zinc-800 bg-zinc-950" /></UiField>
                <UiField label="Background image" hint="Optional https:// link (1000×300 works best). It's darkened so text stays readable.">
                    <input v-model="draft.card.backgroundUrl" placeholder="https://…" class="input" />
                </UiField>
            </div>
            <div class="h-24 overflow-hidden rounded-xl border border-zinc-800 bg-cover bg-center" :style="{ backgroundImage: draft.card.backgroundUrl ? `url(${draft.card.backgroundUrl})` : 'linear-gradient(90deg,#18181b,#27264a)' }">
                <div class="flex h-full items-center gap-4 bg-black/50 px-5">
                    <div class="h-14 w-14 rounded-full border-4" :style="{ borderColor: draft.card.accentColor }" />
                    <div class="flex-1">
                        <div class="font-bold">Vortex Fan <span class="float-right" :style="{ color: draft.card.accentColor }">LEVEL 5</span></div>
                        <div class="mt-2 h-3 rounded-full bg-zinc-700"><div class="h-3 w-3/5 rounded-full" :style="{ background: draft.card.accentColor }" /></div>
                    </div>
                </div>
            </div>
        </UiCard>

        <UiCard v-if="draft" title="Public leaderboard" description="A web page anyone can open, showing this server's top members. Great for sharing.">
            <UiToggle v-model="draft.publicLeaderboard" label="Make the leaderboard public" />
            <p v-if="config?.settings.leveling.publicLeaderboard" class="text-sm text-zinc-400">
                Link: <NuxtLink :to="`/leaderboard/${guildId}`" class="text-brand-400 hover:underline" target="_blank">{{ publicUrl }}</NuxtLink>
            </p>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { guildId, overview, config, save } = useGuildDashboard();
const { draft, dirty, reset } = useDraft(() => config.value?.settings.leveling);
const saving = ref(false);

// Same curve as the bot (lib/leveling.ts): 5n² + 50n + 100 XP per level, scaled by difficulty.
const xpFor = (level: number) => {
    const m = level - 1;
    return Math.round(((5 * m * (m + 1) * (2 * m + 1)) / 6 + 25 * m * (m + 1) + 100 * m) * (draft.value?.difficulty ?? 100) / 100);
};
const messagesFor = (level: number) => Math.ceil(xpFor(level) / Math.max(1, ((draft.value?.xpMin ?? 15) + (draft.value?.xpMax ?? 25)) / 2));

// Same objects as draft.rewards (so edits apply), just shown in level order.
const sortedRewards = computed(() => [...(draft.value?.rewards ?? [])].sort((a, b) => a.level - b.level));

const channelOptions = computed(() => (overview.value?.channels ?? []).map((c) => ({ id: c.id, label: `#${c.name}` })));
const roleOptions = computed(() => (overview.value?.roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color === "#000000" ? undefined : r.color })));
const publicUrl = computed(() => (import.meta.client ? `${location.origin}/leaderboard/${guildId.value}` : ""));

async function submit() {
    saving.value = true;
    await save({ settings: { leveling: draft.value } }).catch(() => null);
    saving.value = false;
}
</script>
