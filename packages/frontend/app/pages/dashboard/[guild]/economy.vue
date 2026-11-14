<!-- Economy: the currency's name and emoji on this server. Balances themselves are shared across servers. -->
<template>
    <div v-if="draft" class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Economy</h1>
            <p class="mt-1 text-sm text-zinc-400">Balances are shared across every server, so only how the currency is shown can be changed here.</p>
        </div>

        <UiCard title="Currency">
            <div class="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <UiField label="Emoji"><input v-model="draft.currencyEmoji" maxlength="64" class="input text-center" placeholder="🪙" /></UiField>
                <UiField label="Name"><input v-model="draft.currencyName" maxlength="24" class="input" /></UiField>
            </div>
            <p class="text-sm text-zinc-400">Preview: <span class="text-zinc-100">{{ draft.currencyEmoji }} <b>1,250</b> {{ draft.currencyName }}</span></p>
        </UiCard>

        <UiCard title="Commands" description="Members earn and spend with these. Turn any off on the Commands page.">
            <p class="text-sm leading-relaxed text-zinc-300">
                <code>/daily</code> <code>/weekly</code> <code>/work</code> <code>/beg</code> <code>/crime</code> <code>/rob</code>
                <code>/pay</code> <code>/deposit</code> <code>/withdraw</code> <code>/balance</code> <code>/leaderboard</code>
                <code>/slots</code> <code>/blackjack</code> <code>/highlow</code> <code>/coinflip</code> <code>/dice</code> <code>/trivia</code>
            </p>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { draft, dirty, reset, saving, submit } = useSettingsSection("economy");
</script>
