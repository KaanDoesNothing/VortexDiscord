<!-- Every server the bot is in: search, sort, blacklist or leave. -->
<template>
    <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
            <form class="flex gap-2" @submit.prevent="search = searchInput.trim(); page = 1">
                <input v-model="searchInput" type="search" placeholder="Search by name or ID…" class="input sm:w-72" />
                <button type="submit" class="btn-ghost">Search</button>
            </form>
            <select v-model="sort" class="input w-auto">
                <option value="members">Most members</option>
                <option value="joined">Recently joined</option>
                <option value="name">Name</option>
            </select>
            <span v-if="data" class="ml-auto text-sm text-zinc-500">{{ data.total.toLocaleString() }} servers</span>
        </div>

        <div class="overflow-x-auto rounded-xl border border-zinc-800">
            <table class="w-full text-left text-sm">
                <thead class="bg-zinc-900 text-zinc-400">
                    <tr>
                        <th class="px-4 py-3 font-medium">Server</th>
                        <th class="px-4 py-3 text-right font-medium">Members</th>
                        <th class="hidden px-4 py-3 text-right font-medium md:table-cell">Shard</th>
                        <th class="hidden px-4 py-3 text-right font-medium md:table-cell">Joined</th>
                        <th class="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    <tr v-if="pending"><td colspan="5" class="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>
                    <tr v-for="g in data?.rows" v-else :key="g.id" class="hover:bg-zinc-900/60">
                        <td class="max-w-0 px-4 py-3">
                            <div class="flex min-w-0 items-center gap-3">
                                <img v-if="g.icon" :src="g.icon" alt="" class="h-8 w-8 shrink-0 rounded-lg" loading="lazy" />
                                <div v-else class="h-8 w-8 shrink-0 rounded-lg bg-zinc-800" />
                                <div class="min-w-0">
                                    <div class="truncate font-medium">{{ g.name }}</div>
                                    <div class="truncate font-mono text-xs text-zinc-500">{{ g.id }}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-right tabular-nums">{{ g.memberCount.toLocaleString() }}</td>
                        <td class="hidden px-4 py-3 text-right text-zinc-400 md:table-cell">#{{ g.shardId }}</td>
                        <td class="hidden px-4 py-3 text-right whitespace-nowrap text-zinc-400 md:table-cell">{{ g.joinedAt ? timeAgo(g.joinedAt) : "—" }}</td>
                        <td class="px-4 py-3 text-right whitespace-nowrap">
                            <NuxtLink :to="`/dashboard/${g.id}`" class="btn-ghost px-2.5 py-1 text-xs">Dashboard</NuxtLink>
                            <button type="button" class="btn-danger ml-2 px-2.5 py-1 text-xs" @click="leave(g, false)">Leave</button>
                            <button type="button" class="btn-danger ml-2 px-2.5 py-1 text-xs" @click="leave(g, true)">Blacklist</button>
                        </td>
                    </tr>
                    <tr v-if="!pending && !data?.rows.length"><td colspan="5" class="px-4 py-8 text-center text-zinc-500">No servers found.</td></tr>
                </tbody>
            </table>
        </div>

        <UiPagination v-if="data" v-model:page="page" :limit="data.limit" :total="data.total" />
    </div>
</template>

<script setup lang="ts">
import type { AdminGuild } from "~/types/admin";
import type { Paginated } from "~/types/dashboard";

const toast = useToast();
const searchInput = ref("");
const search = ref("");
const sort = ref("members");
const page = ref(1);
watch(sort, () => (page.value = 1));

const { data, pending, refresh } = await useFetch<Omit<Paginated<AdminGuild>, "users">>("/api/owner/guilds", { query: { search, sort, page }, server: false });

// Leave a server, optionally blacklisting it so it can't re-add the bot.
async function leave(g: AdminGuild, blacklist: boolean) {
    const question = blacklist
        ? `Blacklist and leave "${g.name}"? The bot will refuse to rejoin it.`
        : `Leave "${g.name}"? They can invite the bot again.`;
    if (!confirm(question)) return;

    try {
        if (blacklist) {
            const reason = prompt("Reason (optional):") ?? "";
            await api("/owner/blacklist", { method: "POST", body: { id: g.id, type: "guild", reason } });
        } else {
            await api(`/owner/guilds/${g.id}`, { method: "DELETE" });
        }
        toast.show(blacklist ? `Blacklisted and left ${g.name}` : `Left ${g.name}`);
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}
</script>
