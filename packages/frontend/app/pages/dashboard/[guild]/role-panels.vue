<!-- Role panels: messages with buttons that give members roles. Create, edit (re-posts/updates the message), delete. -->
<template>
    <div class="space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold">Role panels</h1>
                <p class="mt-1 text-sm text-zinc-400">Let members pick their own roles with buttons, e.g. pronouns, pings or colors.</p>
            </div>
            <button type="button" class="btn-primary" @click="edit()">New panel</button>
        </div>

        <div v-if="pending" class="h-32 animate-pulse rounded-xl bg-zinc-900" />
        <div v-else-if="!panels?.length && !editing" class="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-zinc-400">No role panels yet.</div>

        <ul v-else-if="!editing" class="space-y-3">
            <li v-for="p in panels" :key="p.id" class="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <div class="min-w-0 flex-1">
                    <div class="font-semibold">{{ p.title }}</div>
                    <div class="text-sm text-zinc-400">#{{ channelName(p.channelId) ?? "deleted channel" }} · {{ p.roles.length }} role{{ p.roles.length === 1 ? "" : "s" }} · {{ p.mode === "single" ? "pick one" : "pick any" }}</div>
                </div>
                <button type="button" class="btn-ghost px-3 py-1.5" @click="edit(p)">Edit</button>
                <button type="button" class="btn-danger" @click="remove(p)">Delete</button>
            </li>
        </ul>

        <!-- Editor -->
        <UiCard v-if="editing" :title="editing.id ? 'Edit panel' : 'New panel'">
            <div class="grid gap-4 sm:grid-cols-2">
                <UiField label="Channel"><UiChannelSelect v-model="editing.channelId as string | null" :channels="overview!.channels" placeholder="Pick a channel…" /></UiField>
                <UiField label="Mode">
                    <select v-model="editing.mode" class="input">
                        <option value="toggle">Pick any number of roles</option>
                        <option value="single">Pick only one (switching removes the other)</option>
                    </select>
                </UiField>
            </div>
            <UiField label="Title"><input v-model="editing.title" maxlength="256" class="input" /></UiField>
            <UiField label="Description" hint="Optional text above the buttons."><textarea v-model="editing.description" rows="3" maxlength="2000" class="input" /></UiField>

            <UiField label="Buttons" hint="Up to 25. The label defaults to the role name.">
                <div class="space-y-2">
                    <div v-for="(r, i) in editing.roles" :key="i" class="flex flex-wrap items-center gap-2">
                        <input v-model="r.emoji" placeholder="🙂" maxlength="64" class="input w-16 text-center" title="Emoji (optional)" />
                        <UiRoleSelect v-model="r.roleId as string | null" :roles="overview!.roles" assignable-only class="min-w-40 flex-1" />
                        <input v-model="r.label" placeholder="Button label" maxlength="80" class="input min-w-40 flex-1" />
                        <button type="button" class="btn-danger" @click="editing.roles.splice(i, 1)">✕</button>
                    </div>
                    <button v-if="editing.roles.length < 25" type="button" class="btn-ghost" @click="editing.roles.push({ roleId: '', label: '', emoji: '' })">+ Add button</button>
                </div>
            </UiField>

            <p v-if="error" class="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{{ error }}</p>
            <div class="flex justify-end gap-2">
                <button type="button" class="btn-ghost" @click="editing = null">Cancel</button>
                <button type="button" class="btn-primary" :disabled="busy" @click="submit">{{ busy ? "Posting…" : editing.id ? "Save & update message" : "Create & post" }}</button>
            </div>
        </UiCard>
    </div>
</template>

<script setup lang="ts">
import type { RolePanel } from "~/types/dashboard";

const { guildId, overview, channelName } = useGuildDashboard();
const toast = useToast();
const { data: panels, pending, refresh } = await useFetch<RolePanel[]>(() => `/api/guilds/${guildId.value}/role-panels`, { server: false });

type Draft = Omit<RolePanel, "id" | "messageId"> & { id?: number };
const editing = ref<Draft | null>(null);
const busy = ref(false);
const error = ref("");

function edit(p?: RolePanel) {
    error.value = "";
    editing.value = p
        ? { id: p.id, channelId: p.channelId, title: p.title, description: p.description, mode: p.mode, roles: p.roles.map((r) => ({ ...r, emoji: r.emoji ?? "" })) }
        : { channelId: "", title: "Pick your roles", description: "", mode: "toggle", roles: [{ roleId: "", label: "", emoji: "" }] };
}

async function submit() {
    if (!editing.value) return;
    busy.value = true;
    error.value = "";
    const { id, ...body } = editing.value;
    try {
        if (id) await api(`/guilds/${guildId.value}/role-panels/${id}`, { method: "PATCH", body });
        else await api(`/guilds/${guildId.value}/role-panels`, { method: "POST", body });
        toast.show(id ? "Panel updated" : "Panel posted");
        editing.value = null;
        await refresh();
    } catch (e) {
        error.value = apiError(e);
    } finally {
        busy.value = false;
    }
}

async function remove(p: RolePanel) {
    if (!confirm(`Delete "${p.title}"? Its message will be removed too.`)) return;
    await api(`/guilds/${guildId.value}/role-panels/${p.id}`, { method: "DELETE" }).then(() => toast.show("Panel deleted"), (e) => toast.show(apiError(e), "error"));
    await refresh();
}
</script>
