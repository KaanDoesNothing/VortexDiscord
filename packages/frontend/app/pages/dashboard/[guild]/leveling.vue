<!-- Leveling: on/off, pace, cooldown, ignored channels, and level-up announcements. -->
<template>
    <div v-if="draft" class="space-y-6">
        <h1 class="text-2xl font-bold">Leveling</h1>

        <UiCard title="Leveling" description="Members level up by chatting.">
            <UiToggle v-model="draft.enabled" label="Enable leveling" description="When off, messages don't count and nobody levels up." />

            <div class="grid gap-5 sm:grid-cols-2" :class="{ 'pointer-events-none opacity-50': !draft.enabled }">
                <UiField label="Messages per level" :hint="`Level ${exampleLevel} after ${(exampleLevel - 1) * draft.messagesPerLevel} messages`">
                    <input v-model.number="draft.messagesPerLevel" type="number" min="1" max="10000" class="input" />
                </UiField>
                <UiField label="Cooldown (seconds)" hint="Messages sent faster than this don't count. 0 = every message.">
                    <input v-model.number="draft.cooldownSeconds" type="number" min="0" max="3600" class="input" />
                </UiField>
            </div>

            <UiField label="Ignored channels" hint="Messages here never count (e.g. spam or bot channels).">
                <UiMultiPicker v-model="draft.ignoredChannelIds" :options="channelOptions" noun="channel" />
            </UiField>
        </UiCard>

        <UiCard title="Level-up announcements" :class="{ 'opacity-50': !draft.enabled }">
            <UiToggle v-model="draft.announce" label="Announce level-ups" :disabled="!draft.enabled" />

            <template v-if="draft.announce">
                <UiField label="Channel" hint="Leave empty to reply in the channel where they leveled up.">
                    <UiChannelSelect v-model="draft.announceChannelId" :channels="overview!.channels" placeholder="Same channel as the message" />
                </UiField>
                <UiField label="Message">
                    <UiMessageEditor v-model="draft.message" :placeholders="overview!.placeholders" :only="['{user}', '{user.name}', '{user.mention}', '{server}', '{level}', '{channel}']" />
                </UiField>
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

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, config, save } = useGuildDashboard();
const { draft, dirty, reset } = useDraft(() => config.value?.settings.leveling);
const saving = ref(false);
const exampleLevel = 5;

// Same objects as draft.rewards (so edits apply), just shown in level order.
const sortedRewards = computed(() => [...(draft.value?.rewards ?? [])].sort((a, b) => a.level - b.level));

const channelOptions = computed(() => (overview.value?.channels ?? []).map((c) => ({ id: c.id, label: `#${c.name}` })));

async function submit() {
    saving.value = true;
    await save({ settings: { leveling: draft.value } }).catch(() => null);
    saving.value = false;
}
</script>
