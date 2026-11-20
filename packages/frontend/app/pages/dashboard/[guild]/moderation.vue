<!-- Mod log channel, automatic punishments for warnings, ban appeal DMs, and the full action history. -->
<template>
    <div class="space-y-6">
        <h1 class="text-2xl font-bold">Mod log &amp; punishments</h1>

        <template v-if="draft">
            <UiCard title="Mod log channel" description="Post every warn, timeout, kick, ban and auto-mod action to a channel.">
                <UiToggle v-model="draft.modLog.enabled" label="Post mod actions" />
                <UiField v-if="draft.modLog.enabled" label="Channel">
                    <UiChannelSelect v-model="draft.modLog.channelId" :channels="overview!.channels" placeholder="Pick a channel…" />
                </UiField>
            </UiCard>

            <UiCard title="Warning punishments" description="Automatically punish members when they reach a number of warnings.">
                <div v-for="(rule, i) in draft.warnThresholds" :key="i" class="flex flex-wrap items-center gap-2 text-sm">
                    At
                    <input v-model.number="rule.count" type="number" min="1" max="100" class="input w-20" />
                    warnings:
                    <select v-model="rule.action" class="input w-auto">
                        <option value="timeout">Timeout</option>
                        <option value="kick">Kick</option>
                        <option value="ban">Ban</option>
                    </select>
                    <template v-if="rule.action === 'timeout'">
                        for <input v-model.number="rule.durationMinutes" type="number" min="1" max="40320" class="input w-24" /> minutes
                    </template>
                    <button type="button" class="btn-danger ml-auto" @click="draft.warnThresholds.splice(i, 1)">Remove</button>
                </div>
                <button v-if="draft.warnThresholds.length < 10" type="button" class="btn-ghost" @click="draft.warnThresholds.push({ count: (draft.warnThresholds.at(-1)?.count ?? 2) + 1, action: 'timeout', durationMinutes: 60 })">+ Add rule</button>
            </UiCard>

            <UiCard title="Moderation rules">
                <UiToggle v-model="draft.moderation.requireReason" label="Require a reason" description="Warn, timeout, kick and ban commands won't run without one." />
                <UiField label="Warnings expire after (days)" hint="Older warnings stop counting toward the punishments above. 0 = never.">
                    <input v-model.number="draft.moderation.warnExpiryDays" type="number" min="0" max="3650" class="input sm:w-32" />
                </UiField>
            </UiCard>

            <UiCard title="Punishment DMs" description="Tell members when they're warned, timed out, kicked or banned.">
                <UiToggle v-model="draft.moderation.dmOnAction" label="DM the member" />
                <UiRichMessageEditor v-if="draft.moderation.dmOnAction" v-model="draft.moderation.dmMessage" :placeholders="overview!.placeholders" :only="dmTokens" />
            </UiCard>

            <UiCard title="Ban appeals" description="An extra DM for banned members, e.g. a link to an appeal form.">
                <UiToggle v-model="draft.appeals.enabled" label="Send an appeal message when someone is banned" />
                <UiRichMessageEditor v-if="draft.appeals.enabled" v-model="draft.appeals.message" :placeholders="overview!.placeholders" :only="dmTokens" />
            </UiCard>

            <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
        </template>

        <UiCard title="History">
            <template #action>
                <select v-model="type" class="input w-auto py-1.5">
                    <option value="">All actions</option>
                    <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
                </select>
            </template>

            <div class="-m-5 overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="text-zinc-400">
                        <tr class="border-b border-zinc-800">
                            <th class="px-5 py-3 font-medium">Case</th>
                            <th class="px-5 py-3 font-medium">Action</th>
                            <th class="px-5 py-3 font-medium">User</th>
                            <th class="hidden px-5 py-3 font-medium md:table-cell">Moderator</th>
                            <th class="px-5 py-3 font-medium">Reason</th>
                            <th class="px-5 py-3 text-right font-medium">When</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-800">
                        <tr v-if="pending"><td colspan="6" class="px-5 py-8 text-center text-zinc-500">Loading…</td></tr>
                        <tr v-for="row in data?.rows" v-else :key="row.id" class="hover:bg-zinc-900/60">
                            <td class="px-5 py-3 font-mono text-zinc-500">#{{ row.id }}</td>
                            <td class="px-5 py-3"><span class="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium capitalize">{{ row.type }}</span></td>
                            <td class="max-w-40 px-5 py-3"><UiUserCell :id="row.targetId" :user="row.targetId ? data?.users[row.targetId] : undefined" /></td>
                            <td class="hidden max-w-40 px-5 py-3 md:table-cell"><UiUserCell :id="row.moderatorId" :user="row.moderatorId ? data?.users[row.moderatorId] : undefined" /></td>
                            <td class="max-w-64 truncate px-5 py-3 text-zinc-300" :title="row.reason">{{ row.reason }}</td>
                            <td class="px-5 py-3 text-right whitespace-nowrap text-zinc-500" :title="new Date(row.createdAt).toLocaleString()">{{ timeAgo(row.createdAt) }}</td>
                        </tr>
                        <tr v-if="!pending && !data?.rows.length"><td colspan="6" class="px-5 py-8 text-center text-zinc-500">No actions logged.</td></tr>
                    </tbody>
                </table>
            </div>
        </UiCard>

        <UiPagination v-if="data" v-model:page="page" :limit="data.limit" :total="data.total" />
    </div>
</template>

<script setup lang="ts">
import type { ModLogRow, Paginated } from "~/types/dashboard";

const { guildId, overview, config, save } = useGuildDashboard();

// This page edits three settings sections at once.
const { draft, dirty, reset } = useDraft(() => config.value && {
    modLog: config.value.settings.modLog,
    warnThresholds: config.value.settings.warnThresholds,
    appeals: config.value.settings.appeals,
    moderation: config.value.settings.moderation
});
const dmTokens = ["{user}", "{user.name}", "{server}", "{action}", "{reason}", "{duration}"];
const saving = ref(false);
async function submit() {
    saving.value = true;
    await save({ settings: draft.value }).catch(() => null);
    saving.value = false;
}

const types = ["warn", "timeout", "untimeout", "kick", "ban", "tempban", "softban", "unban", "deafen", "undeafen", "automod"];
const type = ref("");
const page = ref(1);
watch(type, () => (page.value = 1));

const { data, pending } = await useFetch<Paginated<ModLogRow>>(() => `/api/guilds/${guildId.value}/modlogs`, { query: { page, type }, server: false });
</script>
