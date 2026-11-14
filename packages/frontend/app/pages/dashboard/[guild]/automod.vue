<!-- Auto-mod: blocked words, invites, links, mass mentions, spam; what happens to offenders; exemptions. -->
<template>
    <div v-if="draft" class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Auto-mod</h1>
            <p class="mt-1 text-sm text-zinc-400">Removes rule-breaking messages automatically. Members with Manage Messages are never affected.</p>
        </div>

        <UiCard>
            <UiToggle v-model="draft.enabled" label="Enable auto-mod" description="Checks every new and edited message against the rules below." />
        </UiCard>

        <div class="space-y-6" :class="{ 'pointer-events-none opacity-50': !draft.enabled }">
            <UiCard title="Blocked words" description="Single words match whole words only (so &quot;ass&quot; won't hit &quot;class&quot;). Phrases with spaces match anywhere.">
                <textarea v-model="wordsText" rows="4" class="input font-mono" placeholder="one word or phrase per line" />
                <p class="text-xs text-zinc-500">{{ draft.blockedWords.length }}/200 entries</p>
            </UiCard>

            <UiCard title="Links and mentions">
                <UiToggle v-model="draft.blockInvites" label="Block Discord invites" description="discord.gg/… and similar invite links to other servers." />
                <UiToggle v-model="draft.blockLinks" label="Block all other links" />
                <UiField v-if="draft.blockLinks" label="Allowed domains" hint="One per line. Subdomains are included (youtube.com also allows m.youtube.com).">
                    <textarea v-model="domainsText" rows="3" class="input font-mono" placeholder="youtube.com&#10;github.com" />
                </UiField>
                <UiField label="Max mentions per message" hint="0 turns this off.">
                    <input v-model.number="draft.maxMentions" type="number" min="0" max="50" class="input sm:w-32" />
                </UiField>
            </UiCard>

            <UiCard title="Spam">
                <UiToggle v-model="draft.spam.enabled" label="Detect message floods" />
                <div v-if="draft.spam.enabled" class="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
                    More than
                    <input v-model.number="draft.spam.messages" type="number" min="2" max="30" class="input w-20" />
                    messages within
                    <input v-model.number="draft.spam.seconds" type="number" min="1" max="60" class="input w-20" />
                    seconds
                </div>
            </UiCard>

            <UiCard title="Punishment" description="The message is always deleted. Then:">
                <div class="grid gap-2 sm:grid-cols-3">
                    <label v-for="a in actions" :key="a.value" class="cursor-pointer rounded-lg border p-3 text-sm" :class="draft.action === a.value ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700'">
                        <input v-model="draft.action" type="radio" :value="a.value" class="sr-only" />
                        <span class="block font-medium">{{ a.label }}</span>
                        <span class="mt-0.5 block text-zinc-400">{{ a.description }}</span>
                    </label>
                </div>
                <UiField v-if="draft.action === 'timeout'" label="Timeout length (minutes)">
                    <input v-model.number="draft.timeoutMinutes" type="number" min="1" max="40320" class="input sm:w-32" />
                </UiField>
            </UiCard>

            <UiCard title="Exemptions">
                <UiField label="Roles that are never moderated"><UiMultiPicker v-model="draft.exemptRoleIds" :options="roleOptions" noun="role" :max="25" /></UiField>
                <UiField label="Channels that are never moderated"><UiMultiPicker v-model="draft.exemptChannelIds" :options="channelOptions" noun="channel" :max="50" /></UiField>
            </UiCard>
        </div>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, draft, dirty, reset, saving, submit } = useSettingsSection("automod");

const actions = [
    { value: "delete", label: "Just delete", description: "Remove the message, nothing else" },
    { value: "warn", label: "Warn", description: "Adds a warning (counts toward punishments)" },
    { value: "timeout", label: "Timeout", description: "Time the member out for a while" }
] as const;

// Lists edited as one-per-line text.
const lines = (text: string) => text.split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean);
const wordsText = computed({ get: () => draft.value?.blockedWords.join("\n") ?? "", set: (v) => { if (draft.value) draft.value.blockedWords = lines(v); } });
const domainsText = computed({ get: () => draft.value?.allowedDomains.join("\n") ?? "", set: (v) => { if (draft.value) draft.value.allowedDomains = lines(v); } });

const roleOptions = computed(() => (overview.value?.roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color === "#000000" ? undefined : r.color })));
const channelOptions = computed(() => (overview.value?.channels ?? []).map((c) => ({ id: c.id, label: `#${c.name}` })));
</script>
