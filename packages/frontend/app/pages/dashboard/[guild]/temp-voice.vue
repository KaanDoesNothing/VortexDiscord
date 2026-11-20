<!-- Temp voice: "join to create" voice channels that disappear when empty. -->
<template>
    <div v-if="draft" class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Temp voice channels</h1>
            <p class="mt-1 text-sm text-zinc-400">Members join a hub channel and get their own voice channel, deleted again once it's empty. Owners manage theirs with <code>/voice</code> (rename, limit, lock, hide, kick).</p>
        </div>

        <UiCard>
            <UiToggle v-model="draft.enabled" label="Enable temp voice channels" />
            <template v-if="draft.enabled">
                <UiField label="Hub channels" hint="Joining one of these creates a new channel. Make a voice channel called e.g. ➕ Create a channel.">
                    <UiMultiPicker v-model="draft.hubChannelIds" :options="voiceOptions" noun="voice channel" :max="5" />
                </UiField>
                <div class="grid gap-4 sm:grid-cols-2">
                    <UiField label="Create channels in">
                        <select v-model="draft.categoryId" class="input">
                            <option :value="null">Same category as the hub</option>
                            <option v-for="c in overview!.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                        </select>
                    </UiField>
                    <UiField label="User limit" hint="0 = no limit. Owners can change it."><input v-model.number="draft.userLimit" type="number" min="0" max="99" class="input" /></UiField>
                </div>
                <UiField label="Channel name" :hint="`Preview: ${fillSample(draft.nameTemplate)}`">
                    <input v-model="draft.nameTemplate" maxlength="100" class="input" />
                </UiField>
            </template>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, draft, dirty, reset, saving, submit } = useSettingsSection("tempVoice");
const voiceOptions = computed(() => (overview.value?.voiceChannels ?? []).map((c) => ({ id: c.id, label: `🔊 ${c.name}` })));
</script>
