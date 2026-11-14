<!-- Blacklisted users and servers. The bot ignores blacklisted users and leaves blacklisted servers. -->
<template>
    <div class="space-y-6">
        <UiCard title="Add to blacklist">
            <form class="grid gap-3 sm:grid-cols-[8rem_1fr_1fr_auto]" @submit.prevent="add">
                <select v-model="form.type" class="input">
                    <option value="user">User</option>
                    <option value="guild">Server</option>
                </select>
                <input v-model="form.id" :placeholder="form.type === 'user' ? 'User ID' : 'Server ID'" class="input font-mono" />
                <input v-model="form.reason" maxlength="500" placeholder="Reason (optional)" class="input" />
                <button type="submit" class="btn-danger" :disabled="!form.id.trim()">Blacklist</button>
            </form>
            <p class="text-xs text-zinc-500">Blacklisted users are ignored everywhere. Blacklisted servers are left immediately, and the bot leaves again if re-invited.</p>
        </UiCard>

        <div class="overflow-x-auto rounded-xl border border-zinc-800">
            <table class="w-full text-left text-sm">
                <thead class="bg-zinc-900 text-zinc-400">
                    <tr>
                        <th class="px-4 py-3 font-medium">Type</th>
                        <th class="px-4 py-3 font-medium">Who</th>
                        <th class="px-4 py-3 font-medium">Reason</th>
                        <th class="hidden px-4 py-3 text-right font-medium md:table-cell">Added</th>
                        <th class="px-4 py-3" />
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    <tr v-if="pending"><td colspan="5" class="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>
                    <tr v-for="e in list" v-else :key="e.id" class="hover:bg-zinc-900/60">
                        <td class="px-4 py-3"><span class="rounded bg-zinc-800 px-2 py-0.5 text-xs">{{ e.type === "guild" ? "Server" : "User" }}</span></td>
                        <td class="px-4 py-3">
                            <NuxtLink v-if="e.type === 'user'" :to="{ path: '/admin/users', query: { id: e.id } }" class="hover:underline">{{ e.name ?? "Unknown" }}</NuxtLink>
                            <span v-else>{{ e.name ?? "Unknown server" }}</span>
                            <div class="font-mono text-xs text-zinc-500">{{ e.id }}</div>
                        </td>
                        <td class="max-w-64 truncate px-4 py-3 text-zinc-300" :title="e.reason">{{ e.reason || "—" }}</td>
                        <td class="hidden px-4 py-3 text-right whitespace-nowrap text-zinc-500 md:table-cell">{{ timeAgo(e.createdAt) }}</td>
                        <td class="px-4 py-3 text-right"><button type="button" class="btn-ghost px-2.5 py-1 text-xs" @click="remove(e)">Remove</button></td>
                    </tr>
                    <tr v-if="!pending && !list?.length"><td colspan="5" class="px-4 py-8 text-center text-zinc-500">The blacklist is empty.</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { BlacklistEntry } from "~/types/admin";

const toast = useToast();
const { data: list, pending, refresh } = await useFetch<BlacklistEntry[]>("/api/owner/blacklist", { server: false });
const form = reactive({ type: "user" as "user" | "guild", id: "", reason: "" });

async function add() {
    const id = form.id.trim();
    if (form.type === "guild" && !confirm("Blacklisting a server makes the bot leave it right away. Continue?")) return;
    try {
        await api("/owner/blacklist", { method: "POST", body: { id, type: form.type, reason: form.reason } });
        toast.show("Added to the blacklist");
        Object.assign(form, { id: "", reason: "" });
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}

async function remove(e: BlacklistEntry) {
    if (!confirm(`Remove ${e.name ?? e.id} from the blacklist?`)) return;
    await api(`/owner/blacklist/${e.id}`, { method: "DELETE" }).then(() => toast.show("Removed"), (err) => toast.show(apiError(err), "error"));
    await refresh();
}
</script>
