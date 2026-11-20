<!-- Tickets: settings plus a list of recent tickets. Post the "Open a ticket" button with /ticket panel. -->
<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Tickets</h1>
            <p class="mt-1 text-sm text-zinc-400">Private support channels between a member and your staff. After turning this on, run <code>/ticket panel</code> to post the panel. Staff can <code>/ticket claim</code>, <code>add</code> and <code>remove</code> people.</p>
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
                    <div class="grid gap-4 sm:grid-cols-2">
                        <UiField label="Transcript channel" hint="When a ticket closes, its conversation is posted here (and DMed to whoever opened it)."><UiChannelSelect v-model="draft.logChannelId" :channels="overview!.channels" placeholder="Don't save transcripts" /></UiField>
                        <UiField label="Transcript format">
                            <select v-model="draft.transcriptFormat" class="input">
                                <option value="html">Web page (looks like Discord)</option>
                                <option value="text">Plain text</option>
                            </select>
                        </UiField>
                    </div>
                    <UiToggle v-model="draft.pingStaff" label="Ping staff roles when a ticket opens" />
                    <UiField label="Welcome message in new tickets">
                        <UiRichMessageEditor v-model="draft.openMessage" :placeholders="overview!.placeholders" :only="['{user}', '{user.name}', '{user.mention}', '{server}', '{channel}']" />
                    </UiField>
                </template>
            </UiCard>

            <UiCard v-if="draft.enabled" title="Ticket types" description="Show a menu on the panel (Support, Report, Appeal…). Each type can use its own category and staff, and ask questions in a form before the ticket opens. Leave empty for a single button.">
                <div v-for="(type, i) in draft.types" :key="i" class="space-y-3 rounded-lg border border-zinc-800 p-4">
                    <div class="grid gap-3 sm:grid-cols-[6rem_1fr_auto]">
                        <UiField label="Emoji"><input v-model="type.emoji" maxlength="64" class="input text-center" placeholder="🎫" /></UiField>
                        <UiField label="Name"><input v-model="type.name" maxlength="50" class="input" /></UiField>
                        <button type="button" class="btn-danger self-end" @click="draft.types.splice(i, 1)">Remove</button>
                    </div>
                    <UiField label="Description (shown in the menu)"><input v-model="type.description" maxlength="100" class="input" /></UiField>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <UiField label="Category">
                            <select v-model="type.categoryId" class="input">
                                <option :value="null">Same as above</option>
                                <option v-for="c in overview!.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                            </select>
                        </UiField>
                        <UiField label="Staff roles" hint="Empty = the staff roles above."><UiMultiPicker v-model="type.staffRoleIds" :options="roleOptions" noun="role" :max="10" /></UiField>
                    </div>
                    <UiField label="Questions (up to 5, max 45 characters each)" hint="One per line. Answers are posted in the new ticket.">
                        <textarea :value="type.questions.join(NL)" rows="3" class="input" placeholder="What do you need help with?" @input="type.questions = ($event.target as HTMLTextAreaElement).value.split(NL).map((q) => q.slice(0, 45)).slice(0, 5)" />
                    </UiField>
                </div>
                <button v-if="draft.types.length < 10" type="button" class="btn-ghost" @click="draft.types.push({ name: 'Support', emoji: '', description: '', categoryId: null, staffRoleIds: [], questions: [] })">+ Add ticket type</button>
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

// Questions are edited one per line.
const NL = String.fromCharCode(10);
const roleOptions = computed(() => (overview.value?.roles ?? []).map((r) => ({ id: r.id, label: r.name, color: r.color === "#000000" ? undefined : r.color })));
</script>
