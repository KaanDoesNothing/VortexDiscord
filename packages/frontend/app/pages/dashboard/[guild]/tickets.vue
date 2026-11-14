<!-- Tickets: settings plus a list of recent tickets. Post the "Open a ticket" button with /ticket panel. -->
<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Tickets</h1>
            <p class="mt-1 text-sm text-zinc-400">Private support channels between a member and your staff. After turning this on, run <code>/ticket panel</code> to post an "Open a ticket" button.</p>
        </div>

        <template v-if="draft">
            <UiCard>
                <UiToggle v-model="draft.enabled" label="Enable tickets" />
                <template v-if="draft.enabled">
                    <UiField label="Staff roles" hint="Can see and close every ticket."><UiMultiPicker v-model="draft.staffRoleIds" :options="roleOptions" noun="role" :max="10" /></UiField>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <UiField label="Create tickets in category">
                            <select v-model="draft.categoryId" class="input">
                                <option :value="null">No category</option>
                                <option v-for="c in overview!.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                            </select>
                        </UiField>
                        <UiField label="Open tickets per member"><input v-model.number="draft.maxOpenPerUser" type="number" min="1" max="5" class="input" /></UiField>
                    </div>
                    <UiField label="Transcript channel" hint="When a ticket closes, its messages are posted here as a text file."><UiChannelSelect v-model="draft.logChannelId" :channels="overview!.channels" placeholder="Don't save transcripts" /></UiField>
                    <UiField label="Welcome message in new tickets">
                        <UiMessageEditor v-model="draft.openMessage" :placeholders="overview!.placeholders" :only="['{user}', '{user.name}', '{user.mention}', '{server}']" />
                    </UiField>
                </template>
            </UiCard>
            <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
        </template>

        <UiCard title="Recent tickets">
            <p v-if="!list?.rows.length" class="py-4 text-center text-sm text-zinc-500">No tickets yet.</p>
            <ul v-else class="-m-5 divide-y divide-zinc-800">
                <li v-for="t in list.rows" :key="t.id" class="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <span class="rounded px-2 py-0.5 text-xs font-medium" :class="t.closed ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-950 text-emerald-300'">{{ t.closed ? "Closed" : "Open" }}</span>
                    <span class="text-zinc-500">#{{ t.id }}</span>
                    <UiUserCell :id="t.ownerId" :user="list.users[t.ownerId]" />
                    <span class="min-w-0 flex-1 truncate text-zinc-400">{{ t.topic ?? "" }}</span>
                    <span class="text-zinc-500">{{ timeAgo(t.createdAt) }}</span>
                </li>
            </ul>
        </UiCard>
    </div>
</template>

<script setup lang="ts">
import type { ResolvedUser, Ticket } from "~/types/dashboard";

const { guildId, overview, draft, dirty, reset, saving, submit } = { ...useGuildDashboard(), ...useSettingsSection("tickets") };
const { data: list } = await useFetch<{ rows: Ticket[]; users: Record<string, ResolvedUser> }>(() => `/api/guilds/${guildId.value}/tickets`, { server: false });

const roleOptions = computed(() => (overview.value?.roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color === "#000000" ? undefined : r.color })));
</script>
