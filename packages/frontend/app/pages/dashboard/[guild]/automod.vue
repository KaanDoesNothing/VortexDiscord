<!-- Auto-mod: every rule with its own on/off, limits and punishment, plus a default punishment and exemptions. -->
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
            <UiCard title="Default punishment" description="The message is always deleted. Then, unless a rule says otherwise:">
                <div class="grid gap-2 sm:grid-cols-5">
                    <label v-for="a in actions" :key="a.value" class="cursor-pointer rounded-lg border p-3 text-sm" :class="draft.action === a.value ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700'">
                        <input v-model="draft.action" type="radio" :value="a.value" class="sr-only" />
                        <span class="block font-medium">{{ a.label }}</span>
                        <span class="mt-0.5 block text-xs text-zinc-400">{{ a.description }}</span>
                    </label>
                </div>
                <UiField label="Timeout length (minutes)" hint="Used by any rule set to Timeout.">
                    <input v-model.number="draft.timeoutMinutes" type="number" min="1" max="40320" class="input sm:w-32" />
                </UiField>
            </UiCard>

            <UiCard title="Words">
                <div class="flex items-start justify-between gap-4">
                    <p class="text-sm text-zinc-400">Single words match whole words only (so "ass" won't hit "class"). Phrases with spaces match anywhere.</p>
                    <AutomodRuleAction v-model="draft.actions.words" />
                </div>
                <textarea v-model="wordsText" rows="4" class="input font-mono" placeholder="one word or phrase per line" />
                <p class="text-xs text-zinc-500">{{ draft.blockedWords.length }}/200 entries</p>
            </UiCard>

            <UiCard title="Links">
                <AutomodRule v-model:enabled="draft.blockPhishing" v-model:action="draft.actions.phishing" label="Block phishing & scam links" description="Fake Nitro, fake Steam and known scam domains (list updated every few hours)." />
                <AutomodRule v-model:enabled="draft.blockInvites" v-model:action="draft.actions.invites" label="Block Discord invites" description="discord.gg/… and similar invite links to other servers." />
                <AutomodRule v-model:enabled="draft.blockLinks" v-model:action="draft.actions.links" label="Block all other links" />
                <UiField v-if="draft.blockLinks" label="Allowed domains" hint="One per line. Subdomains are included (youtube.com also allows m.youtube.com).">
                    <textarea v-model="domainsText" rows="3" class="input font-mono" placeholder="youtube.com&#10;github.com" />
                </UiField>
            </UiCard>

            <UiCard title="Spam">
                <AutomodRule v-model:enabled="draft.spam.enabled" v-model:action="draft.actions.spam" label="Message floods">
                    More than <input v-model.number="draft.spam.messages" type="number" min="2" max="30" class="input w-20" /> messages within
                    <input v-model.number="draft.spam.seconds" type="number" min="1" max="60" class="input w-20" /> seconds
                </AutomodRule>
                <AutomodRule v-model:enabled="draft.duplicates.enabled" v-model:action="draft.actions.duplicates" label="Repeated messages">
                    The same message <input v-model.number="draft.duplicates.count" type="number" min="2" max="20" class="input w-20" /> times within
                    <input v-model.number="draft.duplicates.seconds" type="number" min="5" max="600" class="input w-20" /> seconds
                </AutomodRule>
                <AutomodRule :enabled="draft.maxMentions > 0" v-model:action="draft.actions.mentions" label="Mass mentions" @update:enabled="draft.maxMentions = $event ? 5 : 0">
                    More than <input v-model.number="draft.maxMentions" type="number" min="1" max="50" class="input w-20" /> users/roles mentioned in one message
                </AutomodRule>
            </UiCard>

            <UiCard title="Formatting">
                <AutomodRule v-model:enabled="draft.caps.enabled" v-model:action="draft.actions.caps" label="Excessive caps">
                    <input v-model.number="draft.caps.percent" type="number" min="50" max="100" class="input w-20" />% or more capitals, in messages with at least
                    <input v-model.number="draft.caps.minLength" type="number" min="3" max="200" class="input w-20" /> letters
                </AutomodRule>
                <AutomodRule v-model:enabled="draft.emoji.enabled" v-model:action="draft.actions.emoji" label="Emoji spam">
                    More than <input v-model.number="draft.emoji.max" type="number" min="1" max="100" class="input w-20" /> emojis
                </AutomodRule>
                <AutomodRule v-model:enabled="draft.repeatedChars.enabled" v-model:action="draft.actions.repeatedChars" label="Repeated characters">
                    The same character more than <input v-model.number="draft.repeatedChars.max" type="number" min="3" max="100" class="input w-20" /> times in a row ("heeeeey")
                </AutomodRule>
                <AutomodRule v-model:enabled="draft.newlines.enabled" v-model:action="draft.actions.newlines" label="Wall of text">
                    More than <input v-model.number="draft.newlines.max" type="number" min="2" max="100" class="input w-20" /> line breaks
                </AutomodRule>
                <AutomodRule v-model:enabled="draft.zalgo" v-model:action="draft.actions.zalgo" label="Zalgo / glitch text" description="Stacked accent marks that make text unreadable." />
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
    { value: "delete", label: "Just delete", description: "Nothing else" },
    { value: "warn", label: "Warn", description: "Counts toward punishments" },
    { value: "timeout", label: "Timeout", description: "For the time below" },
    { value: "kick", label: "Kick", description: "They can rejoin" },
    { value: "ban", label: "Ban", description: "For serious rules" }
] as const;

// Lists edited as one-per-line text.
const lines = (text: string) => text.split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean);
const wordsText = computed({ get: () => draft.value?.blockedWords.join("\n") ?? "", set: (v) => { if (draft.value) draft.value.blockedWords = lines(v); } });
const domainsText = computed({ get: () => draft.value?.allowedDomains.join("\n") ?? "", set: (v) => { if (draft.value) draft.value.allowedDomains = lines(v); } });

const roleOptions = computed(() => (overview.value?.roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color === "#000000" ? undefined : r.color })));
const channelOptions = computed(() => (overview.value?.channels ?? []).map((c) => ({ id: c.id, label: `#${c.name}` })));
</script>
