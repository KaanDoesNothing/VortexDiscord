<!-- Welcome & goodbye messages and auto-roles for new members. -->
<template>
    <div v-if="draft" class="space-y-6">
        <h1 class="text-2xl font-bold">Welcome &amp; roles</h1>

        <!-- These all depend on member join/leave events, which need the Server Members intent. -->
        <div v-if="!overview!.features.membersIntent" class="rounded-xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            <b>Not active yet.</b> These features need the <b>Server Members</b> intent. Turn it on in the Discord Developer Portal
            (Bot → Privileged Gateway Intents), then set <code>DISCORD_MEMBERS_INTENT=true</code> in the bot's <code>.env</code> and restart it.
            You can still set everything up now.
        </div>

        <UiCard v-for="kind in (['welcome', 'goodbye'] as const)" :key="kind" :title="kind === 'welcome' ? 'Welcome message' : 'Goodbye message'" :description="kind === 'welcome' ? 'Sent when someone joins.' : 'Sent when someone leaves.'">
            <UiToggle v-model="draft[kind].enabled" :label="kind === 'welcome' ? 'Send welcome messages' : 'Send goodbye messages'" />
            <template v-if="draft[kind].enabled">
                <UiField label="Channel">
                    <UiChannelSelect v-model="draft[kind].channelId" :channels="overview!.channels" placeholder="Pick a channel…" />
                    <p v-if="!draft[kind].channelId" class="mt-1 text-sm text-amber-300">Pick a channel, or nothing will be sent.</p>
                </UiField>
                <UiField label="Message">
                    <UiMessageEditor v-model="draft[kind].message" :placeholders="overview!.placeholders" :only="['{user}', '{user.name}', '{user.mention}', '{user.id}', '{server}', '{memberCount}']" />
                </UiField>
                <UiToggle v-if="kind === 'welcome'" v-model="draft.welcome.image" label="Attach a welcome card" description="A generated image with their avatar, name and member number." />
            </template>
        </UiCard>

        <UiCard title="Auto-roles" description="Given to every new member (not bots). Up to 10.">
            <UiMultiPicker v-model="draft.autoRoleIds" :options="roleOptions" noun="role" :max="10" />
            <p class="text-sm text-zinc-500">Roles above the bot's highest role or managed by an integration can't be given, so they're greyed out.</p>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, config, save } = useGuildDashboard();

const { draft, dirty, reset } = useDraft(() => config.value && {
    welcome: config.value.settings.welcome,
    goodbye: config.value.settings.goodbye,
    autoRoleIds: config.value.settings.autoRoleIds
});
const saving = ref(false);

const roleOptions = computed(() => (overview.value?.roles ?? []).map((r) => ({
    id: r.id,
    label: r.name,
    color: r.color === "#000000" ? undefined : r.color,
    disabled: !r.assignable,
    note: r.assignable ? undefined : "can't assign"
})));

async function submit() {
    saving.value = true;
    await save({ settings: draft.value }).catch(() => null);
    saving.value = false;
}
</script>
