<!-- Look up any user by ID: profile, economy (editable), birthday, mutual servers, blacklist. -->
<template>
    <div class="space-y-6">
        <form class="flex flex-wrap gap-2" @submit.prevent="lookup">
            <input v-model="idInput" placeholder="User ID, e.g. 123456789012345678" class="input font-mono sm:w-80" />
            <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? "Looking up…" : "Look up" }}</button>
        </form>
        <p class="-mt-4 text-xs text-zinc-500">Tip: enable Developer Mode in Discord, then right-click a user → Copy User ID.</p>

        <p v-if="error" class="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{{ error }}</p>

        <template v-if="user">
            <UiCard>
                <div class="flex flex-wrap items-center gap-4">
                    <img :src="user.avatar" alt="" class="h-16 w-16 rounded-full" />
                    <div class="min-w-0 flex-1">
                        <div class="text-lg font-semibold">{{ user.displayName }} <span class="text-sm font-normal text-zinc-500">@{{ user.username }}</span></div>
                        <div class="font-mono text-xs text-zinc-500">{{ user.id }}</div>
                        <div class="mt-1 flex flex-wrap gap-2 text-xs">
                            <span v-if="user.bot" class="rounded bg-zinc-800 px-2 py-0.5">Bot</span>
                            <span v-if="user.blacklisted" class="rounded bg-red-950 px-2 py-0.5 text-red-300">Blacklisted</span>
                            <span class="text-zinc-500">Account created {{ timeAgo(user.createdAt) }}</span>
                        </div>
                    </div>
                    <button v-if="!user.blacklisted" type="button" class="btn-danger" @click="blacklist">Blacklist</button>
                    <button v-else type="button" class="btn-ghost" @click="unblacklist">Remove from blacklist</button>
                </div>
            </UiCard>

            <UiCard title="Economy & profile" description="Changes apply immediately and are logged in the bot's console.">
                <div class="grid gap-4 sm:grid-cols-2">
                    <UiField label="Wallet"><input v-model.number="edit.balance" type="number" min="0" class="input" /></UiField>
                    <UiField label="Bank"><input v-model.number="edit.bank" type="number" min="0" class="input" /></UiField>
                </div>
                <UiField label="Bio"><input v-model="edit.bio" maxlength="100" class="input" /></UiField>
                <dl class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400">
                    <div>👍 {{ user.data.likes }}</div>
                    <div>👎 {{ user.data.dislikes }}</div>
                    <div>🔥 {{ user.data.dailyStreak }}-day streak</div>
                    <div>🎂 {{ user.birthday ? `${months[user.birthday.month - 1]} ${user.birthday.day}` : "No birthday set" }}</div>
                </dl>
                <div class="flex justify-end gap-2">
                    <button type="button" class="btn-ghost" :disabled="!changed" @click="resetEdit">Reset</button>
                    <button type="button" class="btn-primary" :disabled="!changed || saving" @click="save">{{ saving ? "Saving…" : "Save changes" }}</button>
                </div>
            </UiCard>

            <UiCard :title="`Mutual servers (${user.mutualServers.length})`" description="Servers where the bot has this member cached.">
                <p v-if="!user.mutualServers.length" class="text-sm text-zinc-500">None found in the cache.</p>
                <ul v-else class="flex flex-wrap gap-2">
                    <li v-for="g in user.mutualServers" :key="g.id">
                        <NuxtLink :to="`/dashboard/${g.id}`" class="rounded-full bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700">{{ g.name }}</NuxtLink>
                    </li>
                </ul>
            </UiCard>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { AdminUser } from "~/types/admin";

const toast = useToast();
const route = useRoute();
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const idInput = ref(String(route.query.id ?? ""));
const user = ref<AdminUser | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const edit = reactive({ balance: 0, bank: 0, bio: "" });

const changed = computed(() => !!user.value && (edit.balance !== user.value.data.balance || edit.bank !== user.value.data.bank || edit.bio !== user.value.data.bio));
const resetEdit = () => user.value && Object.assign(edit, { balance: user.value.data.balance, bank: user.value.data.bank, bio: user.value.data.bio });

async function lookup() {
    const id = idInput.value.trim().replace(/[<@!>]/g, "");
    if (!/^\d{15,25}$/.test(id)) { error.value = "Enter a numeric user ID."; return; }

    loading.value = true;
    error.value = "";
    try {
        user.value = await api<AdminUser>(`/owner/users/${id}`);
        resetEdit();
        navigateTo({ query: { id } }, { replace: true });
    } catch (e) {
        user.value = null;
        error.value = apiError(e);
    } finally {
        loading.value = false;
    }
}

async function save() {
    if (!user.value) return;
    saving.value = true;
    try {
        await api(`/owner/users/${user.value.id}`, { method: "PATCH", body: { ...edit } });
        toast.show("User updated");
        await lookup();
    } catch (e) {
        toast.show(apiError(e), "error");
    } finally {
        saving.value = false;
    }
}

async function blacklist() {
    if (!user.value || !confirm(`Blacklist ${user.value.username}? The bot will ignore them everywhere.`)) return;
    const reason = prompt("Reason (optional):") ?? "";
    await api("/owner/blacklist", { method: "POST", body: { id: user.value.id, type: "user", reason } })
        .then(() => toast.show("User blacklisted"), (e) => toast.show(apiError(e), "error"));
    await lookup();
}

async function unblacklist() {
    if (!user.value) return;
    await api(`/owner/blacklist/${user.value.id}`, { method: "DELETE" }).then(() => toast.show("Removed from blacklist"), (e) => toast.show(apiError(e), "error"));
    await lookup();
}

// Opened with ?id=… (e.g. from the blacklist page): look up straight away.
onMounted(() => { if (idInput.value) lookup(); });
</script>
