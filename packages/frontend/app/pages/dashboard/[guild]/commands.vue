<!-- Turn built-in commands on/off, grouped by category, with bulk toggles per category. -->
<template>
    <div class="space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold">Commands</h1>
                <p class="mt-1 text-sm text-zinc-400">{{ enabledCount }} of {{ commands?.length ?? 0 }} enabled. Disabled commands reply with a short notice.</p>
            </div>
            <input v-model="search" type="search" placeholder="Search commands…" class="input sm:w-64" />
        </div>

        <p v-if="error" class="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">Couldn't load the command list.</p>

        <template v-else-if="draft">
            <UiCard v-for="group in groups" :key="group.category" :title="group.category">
                <template #action>
                    <div class="flex gap-2 text-sm">
                        <button type="button" class="text-zinc-400 hover:text-zinc-100" @click="setAll(group.names, true)">Enable all</button>
                        <span class="text-zinc-700">·</span>
                        <button type="button" class="text-zinc-400 hover:text-zinc-100" @click="setAll(group.names, false)">Disable all</button>
                    </div>
                </template>
                <div class="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div v-for="command in group.commands" :key="command.name" class="flex items-start gap-2">
                        <UiToggle
                            class="flex-1"
                            :model-value="!draft.includes(command.name)"
                            :label="`/${command.name}`"
                            :description="command.description"
                            :disabled="command.name === 'command'"
                            @update:model-value="(on) => setAll([command.name], on)"
                        />
                        <!-- Per-command rules: roles, channels, cooldown. Highlighted when set. -->
                        <button
                            type="button"
                            class="mt-0.5 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                            :class="{ 'text-brand-400': rules[command.name] }"
                            :title="rules[command.name] ? 'Has custom rules' : 'Set roles, channels or a cooldown'"
                            :aria-label="`Rules for ${command.name}`"
                            @click="openRules(command.name)"
                        >⚙</button>
                    </div>
                </div>
            </UiCard>
            <p v-if="!groups.length" class="py-8 text-center text-zinc-500">No commands match your search.</p>
        </template>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />

        <!-- Rules dialog for one command -->
        <dialog ref="dialog" class="m-auto w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-100 backdrop:bg-black/60">
            <div v-if="rule" class="space-y-5 p-6">
                <h2 class="text-lg font-semibold">Rules for /{{ rule.name }}</h2>
                <p class="text-sm text-zinc-400">Members with Manage Server always bypass role and channel limits.</p>
                <UiField label="Only these roles can use it" hint="Empty = everyone."><UiMultiPicker v-model="rule.roleIds" :options="roleOptions" noun="role" :max="25" /></UiField>
                <UiField label="Only in these channels" hint="Empty = anywhere commands are allowed."><UiMultiPicker v-model="rule.channelIds" :options="channelOptions" noun="channel" :max="25" /></UiField>
                <UiField label="Cooldown per user (seconds)" hint="0 = none."><input v-model.number="rule.cooldownSeconds" type="number" min="0" max="86400" class="input sm:w-40" /></UiField>
                <div class="flex justify-between gap-2">
                    <button type="button" class="btn-danger" @click="saveRule(true)">Clear rules</button>
                    <div class="flex gap-2">
                        <button type="button" class="btn-ghost" @click="dialog?.close()">Cancel</button>
                        <button type="button" class="btn-primary" :disabled="ruleSaving" @click="saveRule(false)">Save</button>
                    </div>
                </div>
            </div>
        </dialog>
    </div>
</template>

<script setup lang="ts">
const { config, save, overview } = useGuildDashboard();
const { data: commands, error } = await useCommands();

// ---- Per-command rules (saved immediately from the dialog, separate from the toggles' save bar) ----
type Rule = { roleIds: string[]; channelIds: string[]; cooldownSeconds: number };
const rules = computed(() => config.value?.settings.commandRules ?? {});
const dialog = ref<HTMLDialogElement>();
const rule = ref<(Rule & { name: string }) | null>(null);
const ruleSaving = ref(false);

const roleOptions = computed(() => (overview.value?.roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color === "#000000" ? undefined : r.color })));
const channelOptions = computed(() => (overview.value?.channels ?? []).map((c) => ({ id: c.id, label: `#${c.name}` })));

function openRules(name: string) {
    const existing = rules.value[name];
    rule.value = { name, roleIds: [...(existing?.roleIds ?? [])], channelIds: [...(existing?.channelIds ?? [])], cooldownSeconds: existing?.cooldownSeconds ?? 0 };
    nextTick(() => dialog.value?.showModal());
}

async function saveRule(clear: boolean) {
    if (!rule.value) return;
    const { name, ...value } = rule.value;
    const next = { ...rules.value };
    // An empty rule is the same as no rule.
    if (clear || (!value.roleIds.length && !value.channelIds.length && !value.cooldownSeconds)) delete next[name];
    else next[name] = value;

    ruleSaving.value = true;
    await save({ settings: { commandRules: next } }).then(() => dialog.value?.close(), () => null);
    ruleSaving.value = false;
}

// The draft is the list of disabled command names.
const { draft, dirty, reset } = useDraft(() => config.value?.disabledCommands);
const search = ref("");
const saving = ref(false);

const groups = computed(() => {
    const q = search.value.trim().toLowerCase();
    const list = (commands.value ?? []).filter((c) => !q || c.name.includes(q) || c.description?.toLowerCase().includes(q));
    const byCategory = new Map<string, typeof list>();
    for (const c of list) byCategory.set(c.category, [...(byCategory.get(c.category) ?? []), c]);

    return [...byCategory.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, cmds]) => ({ category, commands: cmds, names: cmds.map((c) => c.name).filter((n) => n !== "command") }));
});

const enabledCount = computed(() => (commands.value?.length ?? 0) - (draft.value?.length ?? 0));

// Enable or disable a set of commands in the draft.
function setAll(names: string[], enabled: boolean) {
    const disabled = new Set(draft.value);
    for (const name of names) enabled ? disabled.delete(name) : disabled.add(name);
    draft.value = [...disabled].sort();
}

async function submit() {
    saving.value = true;
    await save({ disabledCommands: draft.value }).catch(() => null);
    saving.value = false;
}
</script>
