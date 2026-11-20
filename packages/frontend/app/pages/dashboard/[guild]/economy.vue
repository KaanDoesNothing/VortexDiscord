<!-- Economy: currency look, shared vs. server economy, payouts, and the server's shop. -->
<template>
    <div class="space-y-6">
        <h1 class="text-2xl font-bold">Economy</h1>

        <template v-if="draft">
            <UiCard title="Currency">
                <div class="grid gap-4 sm:grid-cols-[8rem_1fr]">
                    <UiField label="Emoji"><input v-model="draft.currencyEmoji" maxlength="64" class="input text-center" placeholder="🪙" /></UiField>
                    <UiField label="Name"><input v-model="draft.currencyName" maxlength="24" class="input" /></UiField>
                </div>
                <p class="text-sm text-zinc-400">Preview: <span class="text-zinc-100">{{ draft.currencyEmoji }} <b>1,250</b> {{ draft.currencyName }}</span></p>
            </UiCard>

            <UiCard title="Economy mode">
                <div class="grid gap-2 sm:grid-cols-2">
                    <label v-for="m in modes" :key="m.value" class="cursor-pointer rounded-lg border p-3 text-sm" :class="draft.mode === m.value ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700'">
                        <input v-model="draft.mode" type="radio" :value="m.value" class="sr-only" />
                        <span class="block font-medium">{{ m.label }}</span>
                        <span class="mt-0.5 block text-zinc-400">{{ m.description }}</span>
                    </label>
                </div>
                <p v-if="draft.mode !== config?.settings.economy.mode" class="text-sm text-amber-300">
                    Switching modes doesn't move coins: {{ draft.mode === "server" ? "everyone starts this server's economy fresh" : "members go back to their shared balances" }}.
                </p>
                <UiToggle v-model="draft.gambling.enabled" label="Allow gambling" description="/slots, /blackjack, /coinflip, /dice and /highlow." />
                <UiToggle v-model="draft.rob.enabled" label="Allow /rob" />
            </UiCard>

            <UiCard v-if="draft.mode === 'server'" title="Payouts" description="Only for this server's own economy. The shared economy always uses the standard amounts.">
                <div class="grid gap-4 sm:grid-cols-3">
                    <UiField label="Starting balance"><input v-model.number="draft.startingBalance" type="number" min="0" class="input" /></UiField>
                    <UiField label="Daily reward"><input v-model.number="draft.daily.reward" type="number" min="0" class="input" /></UiField>
                    <UiField label="Daily streak bonus" hint="Extra per streak day (up to 10)"><input v-model.number="draft.daily.streakBonus" type="number" min="0" class="input" /></UiField>
                    <UiField label="Weekly reward"><input v-model.number="draft.weekly.reward" type="number" min="0" class="input" /></UiField>
                    <UiField label="Max bet"><input v-model.number="draft.gambling.maxBet" type="number" min="1" class="input" /></UiField>
                </div>
                <div v-for="job in jobs" :key="job.key" class="grid items-end gap-3 border-t border-zinc-800 pt-4 sm:grid-cols-4">
                    <div class="font-medium sm:col-span-4"><code>/{{ job.key }}</code> <span class="text-sm text-zinc-500">{{ job.hint }}</span></div>
                    <UiField label="Min pay"><input v-model.number="draft[job.key].min" type="number" min="0" class="input" /></UiField>
                    <UiField label="Max pay"><input v-model.number="draft[job.key].max" type="number" min="0" class="input" /></UiField>
                    <UiField label="Cooldown (minutes)"><input v-model.number="draft[job.key].cooldownMinutes" type="number" min="1" max="10080" class="input" /></UiField>
                    <UiField v-if="job.key !== 'work'" label="Success chance (%)"><input v-model.number="draft[job.key as 'beg' | 'crime'].chance" type="number" min="0" max="100" class="input" /></UiField>
                </div>
                <div class="grid items-end gap-3 border-t border-zinc-800 pt-4 sm:grid-cols-4">
                    <div class="font-medium sm:col-span-4"><code>/crime</code> fines and <code>/rob</code></div>
                    <UiField label="Crime fine (min)"><input v-model.number="draft.crime.fineMin" type="number" min="0" class="input" /></UiField>
                    <UiField label="Crime fine (max)"><input v-model.number="draft.crime.fineMax" type="number" min="0" class="input" /></UiField>
                    <UiField label="Rob chance (%)"><input v-model.number="draft.rob.chance" type="number" min="0" max="100" class="input" /></UiField>
                    <UiField label="Rob cooldown (min)"><input v-model.number="draft.rob.cooldownMinutes" type="number" min="1" max="10080" class="input" /></UiField>
                </div>
                <p class="text-xs text-zinc-500">Admins can also <code>/economy give</code>, <code>take</code> and <code>reset</code> in server mode.</p>
            </UiCard>

            <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
        </template>

        <UiCard title="Shop" description="Members buy with /shop buy. Role items give the role; other items go in their /inventory and can be used with /use.">
            <template #action>
                <button type="button" class="btn-primary py-1.5" @click="openItem()">Add item</button>
            </template>
            <p v-if="!items?.length" class="text-sm text-zinc-500">The shop is empty.</p>
            <ul v-else class="-m-5 divide-y divide-zinc-800">
                <li v-for="item in items" :key="item.id" class="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <span class="text-lg">{{ item.emoji || (item.roleId ? "🎭" : "📦") }}</span>
                    <div class="min-w-0 flex-1">
                        <div class="font-semibold" :class="{ 'text-zinc-500 line-through': !item.enabled }">{{ item.name }}</div>
                        <div class="truncate text-zinc-400">{{ item.roleId ? `Gives @${roleName(item.roleId)}` : item.description || "Inventory item" }}{{ item.stock !== null ? ` · ${item.stock} left` : "" }}</div>
                    </div>
                    <span class="font-medium tabular-nums">{{ config?.settings.economy.currencyEmoji }} {{ item.price.toLocaleString() }}</span>
                    <button type="button" class="btn-ghost px-3 py-1.5" @click="openItem(item)">Edit</button>
                    <button type="button" class="btn-danger" @click="removeItem(item)">Delete</button>
                </li>
            </ul>
        </UiCard>

        <dialog ref="dialog" class="m-auto w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-100 backdrop:bg-black/60" @close="editing = null">
            <form v-if="editing" class="space-y-4 p-6" @submit.prevent="submitItem">
                <h2 class="text-lg font-semibold">{{ editing.id ? "Edit item" : "New item" }}</h2>
                <div class="grid gap-4 sm:grid-cols-[6rem_1fr_10rem]">
                    <UiField label="Emoji"><input v-model="editing.emoji" maxlength="64" class="input text-center" /></UiField>
                    <UiField label="Name"><input v-model="editing.name" required maxlength="50" class="input" /></UiField>
                    <UiField label="Price"><input v-model.number="editing.price" type="number" min="0" required class="input" /></UiField>
                </div>
                <UiField label="Description"><input v-model="editing.description" maxlength="200" class="input" /></UiField>
                <UiField label="Gives role" hint="Leave empty for an item that goes in the inventory."><UiRoleSelect v-model="editing.roleId" :roles="overview!.roles" assignable-only placeholder="No role (inventory item)" /></UiField>
                <div class="grid gap-4 sm:grid-cols-2">
                    <UiField label="Stock" hint="Empty = unlimited"><input :value="editing.stock ?? ''" type="number" min="0" class="input" @input="editing.stock = ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value)" /></UiField>
                    <UiField v-if="!editing.roleId" label="Max per member" hint="0 = no limit"><input v-model.number="editing.maxPerUser" type="number" min="0" class="input" /></UiField>
                </div>
                <UiField label="Only buyable with role"><UiRoleSelect v-model="editing.requiredRoleId" :roles="overview!.roles" placeholder="Anyone can buy" /></UiField>
                <UiToggle v-model="editing.enabled" label="For sale" />
                <p v-if="itemError" class="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{{ itemError }}</p>
                <div class="flex justify-end gap-2">
                    <button type="button" class="btn-ghost" @click="dialog?.close()">Cancel</button>
                    <button type="submit" class="btn-primary" :disabled="busy">{{ busy ? "Saving…" : "Save" }}</button>
                </div>
            </form>
        </dialog>
    </div>
</template>

<script setup lang="ts">
import type { ShopItem } from "~/types/dashboard";

const { guildId, overview, config, draft, dirty, reset, saving, submit } = { ...useGuildDashboard(), ...useSettingsSection("economy") };
const toast = useToast();

const modes = [
    { value: "global", label: "Shared economy", description: "Balances carry over to every server with the bot. Standard payouts." },
    { value: "server", label: "This server only", description: "Its own balances, leaderboard and payouts you choose." }
] as const;
const jobs = [
    { key: "work", hint: "Always pays" },
    { key: "beg", hint: "Sometimes pays" },
    { key: "crime", hint: "Pays big or costs a fine" }
] as const;

const roleName = (id: string) => overview.value?.roles.find((r) => r.id === id)?.name ?? "deleted role";

const { data: items, refresh } = await useFetch<ShopItem[]>(() => `/api/guilds/${guildId.value}/shop`, { server: false });
const dialog = ref<HTMLDialogElement>();
const editing = ref<(Omit<ShopItem, "id"> & { id?: number }) | null>(null);
const itemError = ref("");
const busy = ref(false);

function openItem(item?: ShopItem) {
    editing.value = item ? { ...item } : { name: "", description: "", emoji: "", price: 1000, roleId: null, stock: null, maxPerUser: 0, requiredRoleId: null, enabled: true };
    itemError.value = "";
    nextTick(() => dialog.value?.showModal());
}

async function submitItem() {
    if (!editing.value) return;
    busy.value = true;
    itemError.value = "";
    const { id, ...body } = editing.value;
    try {
        if (id) await api(`/guilds/${guildId.value}/shop/${id}`, { method: "PATCH", body });
        else await api(`/guilds/${guildId.value}/shop`, { method: "POST", body });
        dialog.value?.close();
        toast.show(id ? "Item updated" : "Item added");
        await refresh();
    } catch (e) {
        itemError.value = apiError(e);
    } finally {
        busy.value = false;
    }
}

async function removeItem(item: ShopItem) {
    if (!confirm(`Delete ${item.name}? Members who own it lose it.`)) return;
    try {
        await api(`/guilds/${guildId.value}/shop/${item.id}`, { method: "DELETE" });
        await refresh();
    } catch (e) {
        toast.show(apiError(e), "error");
    }
}
</script>
