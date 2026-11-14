<!-- Starboard: repost messages that get enough reactions to a highlight channel. -->
<template>
    <div v-if="draft" class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Starboard</h1>
            <p class="mt-1 text-sm text-zinc-400">When a message gets enough ⭐ reactions it's reposted to a highlights channel.</p>
        </div>

        <UiCard>
            <UiToggle v-model="draft.enabled" label="Enable starboard" />
            <template v-if="draft.enabled">
                <UiField label="Starboard channel"><UiChannelSelect v-model="draft.channelId" :channels="overview!.channels" placeholder="Pick a channel…" /></UiField>
                <div class="grid gap-4 sm:grid-cols-2">
                    <UiField label="Reactions needed"><input v-model.number="draft.threshold" type="number" min="1" max="100" class="input" /></UiField>
                    <UiField label="Emoji" hint="A regular emoji, or a custom one as <:name:id>"><input v-model="draft.emoji" maxlength="64" class="input" /></UiField>
                </div>
                <UiToggle v-model="draft.allowSelfStar" label="Count the author's own reaction" />
            </template>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, draft, dirty, reset, saving, submit } = useSettingsSection("starboard");
</script>
