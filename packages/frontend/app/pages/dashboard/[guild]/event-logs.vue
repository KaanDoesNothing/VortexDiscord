<!-- Event logs: pick a channel for each kind of server event. -->
<template>
    <div v-if="draft" class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Event logs</h1>
            <p class="mt-1 text-sm text-zinc-400">Keep a record of what happens on the server. Leave a log empty to turn it off. Use a private staff channel.</p>
        </div>

        <UiCard>
            <UiField v-for="log in logs" :key="log.key" :label="log.label" :hint="log.hint">
                <UiChannelSelect v-model="draft[log.key]" :channels="overview!.channels" placeholder="Off" />
                <p v-if="log.needsMembers && draft[log.key] && !overview!.features.membersIntent" class="mt-1 text-xs text-amber-300">
                    Needs the Server Members intent to be enabled on the bot.
                </p>
            </UiField>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, draft, dirty, reset, saving, submit } = useSettingsSection("logs");

const logs = [
    { key: "messages", label: "Deleted & edited messages", hint: "Shows the old content of edited or deleted messages.", needsMembers: false },
    { key: "members", label: "Joins & leaves", hint: "Includes account age, so new raid accounts stand out.", needsMembers: true },
    { key: "roles", label: "Role & nickname changes", hint: "Who got or lost which role, and nickname changes.", needsMembers: true },
    { key: "voice", label: "Voice activity", hint: "Joining, leaving and moving between voice channels.", needsMembers: false },
    { key: "server", label: "Server changes", hint: "Channels, roles and emojis being created, deleted or edited, and server settings.", needsMembers: false },
    { key: "moderation", label: "Bans & unbans", hint: "Including ones done in Discord itself, with who did it (from the audit log).", needsMembers: false },
    { key: "invites", label: "Invites", hint: "Invites created and deleted, and which invite each new member used.", needsMembers: true }
] as const;
</script>
