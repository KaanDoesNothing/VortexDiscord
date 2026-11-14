<!-- Birthday announcements. Members set their birthday with /birthday set. -->
<template>
    <div v-if="draft" class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Birthdays</h1>
            <p class="mt-1 text-sm text-zinc-400">Members set their birthday with <code>/birthday set</code>. Announcements go out just after midnight (UTC).</p>
        </div>

        <UiCard>
            <UiToggle v-model="draft.enabled" label="Announce birthdays" />
            <template v-if="draft.enabled">
                <UiField label="Channel"><UiChannelSelect v-model="draft.channelId" :channels="overview!.channels" placeholder="Pick a channel…" /></UiField>
                <UiField label="Message">
                    <UiMessageEditor v-model="draft.message" :placeholders="overview!.placeholders" :only="['{user}', '{user.name}', '{user.mention}', '{server}']" />
                </UiField>
            </template>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, draft, dirty, reset, saving, submit } = useSettingsSection("birthdays");
</script>
