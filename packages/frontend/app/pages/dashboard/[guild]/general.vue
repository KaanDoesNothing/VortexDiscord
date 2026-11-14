<!-- General: prefix and which channels commands work in. -->
<template>
    <div v-if="draft" class="space-y-6">
        <h1 class="text-2xl font-bold">General</h1>

        <UiCard title="Prefix" description="Used for text commands, e.g. ->help. Slash commands always work.">
            <UiField label="Prefix" hint="1 to 10 characters">
                <input v-model="draft.prefix" maxlength="10" class="input font-mono sm:w-48" />
            </UiField>
        </UiCard>

        <UiCard title="Command channels" description="Limit where members can use commands. The /command command always works, so admins can't lock themselves out.">
            <div class="grid gap-2 sm:grid-cols-3">
                <label v-for="mode in modes" :key="mode.value" class="cursor-pointer rounded-lg border p-3 text-sm transition" :class="draft.commandChannels.mode === mode.value ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700'">
                    <input v-model="draft.commandChannels.mode" type="radio" :value="mode.value" class="sr-only" />
                    <span class="block font-medium">{{ mode.label }}</span>
                    <span class="mt-0.5 block text-zinc-400">{{ mode.description }}</span>
                </label>
            </div>

            <UiField v-if="draft.commandChannels.mode !== 'all'" :label="draft.commandChannels.mode === 'allow' ? 'Allowed channels' : 'Blocked channels'">
                <UiMultiPicker v-model="draft.commandChannels.channelIds" :options="channelOptions" noun="channel" />
            </UiField>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, config, save } = useGuildDashboard();

// One draft for both cards on this page.
const { draft, dirty, reset } = useDraft(() => config.value && {
    prefix: config.value.prefix,
    commandChannels: config.value.settings.commandChannels
});

const saving = ref(false);

const modes = [
    { value: "all", label: "Everywhere", description: "Commands work in every channel" },
    { value: "allow", label: "Only in…", description: "Only in the channels you pick" },
    { value: "deny", label: "Everywhere except…", description: "Block the channels you pick" }
] as const;

const channelOptions = computed(() => (overview.value?.channels ?? []).map((c) => ({ id: c.id, label: `#${c.name}` })));

async function submit() {
    if (!draft.value) return;
    saving.value = true;
    await save({ prefix: draft.value.prefix, settings: { commandChannels: draft.value.commandChannels } }).catch(() => null);
    saving.value = false;
}
</script>
