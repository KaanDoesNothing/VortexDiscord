<!-- Custom commands: list, create, edit, enable/disable and delete "prefix + name → response" commands. -->
<template>
    <div class="space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold">Custom commands</h1>
                <p class="mt-1 text-sm text-zinc-400">
                    Members type <code class="text-zinc-200">{{ config?.prefix }}name</code> and the bot replies. {{ commands?.length ?? 0 }}/100 used.
                </p>
            </div>
            <button type="button" class="btn-primary" @click="openEditor()">New command</button>
        </div>

        <div v-if="pending" class="h-40 animate-pulse rounded-xl bg-zinc-900" />

        <div v-else-if="!commands?.length" class="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
            <p class="text-zinc-400">No custom commands yet.</p>
            <button type="button" class="btn-primary mt-4" @click="openEditor()">Create your first one</button>
        </div>

        <ul v-else class="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
            <li v-for="cmd in commands" :key="cmd.id" class="flex flex-wrap items-center gap-4 bg-zinc-900/60 px-4 py-3">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-mono font-semibold" :class="cmd.enabled ? 'text-brand-400' : 'text-zinc-500 line-through'">{{ config?.prefix }}{{ cmd.name }}</span>
                        <span v-if="cmd.embed" class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">embed</span>
                    </div>
                    <p class="mt-0.5 truncate text-sm text-zinc-400">{{ cmd.response }}</p>
                </div>
                <span class="text-xs text-zinc-500 tabular-nums">{{ cmd.uses.toLocaleString() }} uses</span>
                <UiToggle :model-value="cmd.enabled" :label="`Enable ${cmd.name}`" class="[&>span]:sr-only" @update:model-value="(v) => update(cmd, { enabled: v })" />
                <button type="button" class="btn-ghost px-3 py-1.5" @click="openEditor(cmd)">Edit</button>
                <button type="button" class="btn-danger" @click="remove(cmd)">Delete</button>
            </li>
        </ul>

        <!-- Create / edit dialog -->
        <dialog ref="dialog" class="m-auto w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-100 backdrop:bg-black/60" @close="editing = null">
            <form v-if="editing" class="space-y-5 p-6" @submit.prevent="submitEditor">
                <h2 class="text-lg font-semibold">{{ editing.id ? "Edit command" : "New command" }}</h2>

                <UiField label="Name" hint="Lowercase letters, numbers, - and _. Can't match a built-in command.">
                    <div class="flex items-center rounded-lg border border-zinc-800 bg-zinc-950 focus-within:border-brand-500">
                        <span class="pl-3 font-mono text-sm text-zinc-500">{{ config?.prefix }}</span>
                        <input v-model="editing.name" required maxlength="32" pattern="[a-z0-9_\-]+" class="w-full bg-transparent px-1 py-2 font-mono text-sm outline-none" @input="editing.name = editing.name.toLowerCase()" />
                    </div>
                </UiField>

                <UiField label="Response">
                    <UiMessageEditor v-model="editing.response" :placeholders="overview?.placeholders ?? {}" :only="['{user}', '{user.name}', '{user.mention}', '{server}', '{memberCount}', '{channel}', '{args}']" :max="2000" :rows="4" />
                </UiField>

                <UiToggle v-model="editing.embed" label="Send as embed" description="Shows the response in a colored box instead of plain text." />

                <p v-if="editorError" class="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{{ editorError }}</p>

                <div class="flex justify-end gap-2">
                    <button type="button" class="btn-ghost" @click="dialog?.close()">Cancel</button>
                    <button type="submit" class="btn-primary" :disabled="busy">{{ busy ? "Saving…" : "Save" }}</button>
                </div>
            </form>
        </dialog>
    </div>
</template>

<script setup lang="ts">
import type { CustomCommand } from "~/types/dashboard";

const { guildId, overview, config } = useGuildDashboard();
const toast = useToast();

const { data: commands, pending, refresh } = await useFetch<CustomCommand[]>(() => `/api/guilds/${guildId.value}/custom-commands`, { server: false });

const dialog = ref<HTMLDialogElement>();
const editing = ref<{ id?: number; name: string; response: string; embed: boolean } | null>(null);
const editorError = ref("");
const busy = ref(false);

function openEditor(cmd?: CustomCommand) {
    editing.value = cmd ? { id: cmd.id, name: cmd.name, response: cmd.response, embed: cmd.embed } : { name: "", response: "", embed: false };
    editorError.value = "";
    nextTick(() => dialog.value?.showModal());
}

async function submitEditor() {
    if (!editing.value) return;
    busy.value = true;
    editorError.value = "";
    const { id, ...body } = editing.value;
    try {
        if (id) await api(`/guilds/${guildId.value}/custom-commands/${id}`, { method: "PATCH", body });
        else await api(`/guilds/${guildId.value}/custom-commands`, { method: "POST", body });
        dialog.value?.close();
        toast.show(id ? "Command updated" : "Command created");
        await refresh();
    } catch (e) {
        editorError.value = apiError(e);
    } finally {
        busy.value = false;
    }
}

async function update(cmd: CustomCommand, patch: Partial<CustomCommand>) {
    try {
        await api(`/guilds/${guildId.value}/custom-commands/${cmd.id}`, { method: "PATCH", body: patch });
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}

async function remove(cmd: CustomCommand) {
    if (!confirm(`Delete ${config.value?.prefix}${cmd.name}? This can't be undone.`)) return;
    try {
        await api(`/guilds/${guildId.value}/custom-commands/${cmd.id}`, { method: "DELETE" });
        toast.show("Command deleted");
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}
</script>
