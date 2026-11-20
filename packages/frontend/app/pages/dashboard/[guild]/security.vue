<!-- Security: raid protection (join floods, new accounts, lockdowns) and member verification. -->
<template>
    <div v-if="draft" class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Anti-raid &amp; verification</h1>
            <p class="mt-1 text-sm text-zinc-400">Stop raids before they start, and make new members prove they're human.</p>
        </div>

        <div v-if="!overview!.features.membersIntent" class="rounded-xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            Raid protection reacts to members joining, which needs the <b>Server Members</b> intent on the bot (see Welcome &amp; roles).
        </div>
        <div v-if="!overview!.features.manageGuild" class="rounded-xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            Lockdowns change the server's verification level, so the bot needs the <b>Manage Server</b> permission.
        </div>

        <UiCard title="Raid protection">
            <UiToggle v-model="draft.antiRaid.enabled" label="Enable raid protection" />
            <template v-if="draft.antiRaid.enabled">
                <div class="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
                    A raid is more than
                    <input v-model.number="draft.antiRaid.joins" type="number" min="3" max="100" class="input w-20" />
                    joins within
                    <input v-model.number="draft.antiRaid.seconds" type="number" min="3" max="300" class="input w-20" />
                    seconds.
                </div>
                <div class="grid gap-2 sm:grid-cols-2">
                    <label v-for="a in raidActions" :key="a.value" class="cursor-pointer rounded-lg border p-3 text-sm" :class="draft.antiRaid.action === a.value ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700'">
                        <input v-model="draft.antiRaid.action" type="radio" :value="a.value" class="sr-only" />
                        <span class="block font-medium">{{ a.label }}</span>
                        <span class="mt-0.5 block text-zinc-400">{{ a.description }}</span>
                    </label>
                </div>
                <UiField v-if="draft.antiRaid.action === 'lockdown'" label="Lockdown length (minutes)" hint="End it early with /lockdown end. Start one by hand with /lockdown start.">
                    <input v-model.number="draft.antiRaid.lockdownMinutes" type="number" min="1" max="1440" class="input sm:w-32" />
                </UiField>
                <UiField label="Minimum account age (days)" hint="Kick brand-new accounts on join, a common raid and alt signal. 0 = off.">
                    <input v-model.number="draft.antiRaid.minAccountAgeDays" type="number" min="0" max="365" class="input sm:w-32" />
                </UiField>
                <UiField label="Alert channel" hint="Raid alerts go here. Empty = the mod log channel.">
                    <UiChannelSelect v-model="draft.antiRaid.alertChannelId" :channels="overview!.channels" placeholder="Mod log channel" />
                </UiField>
            </template>
        </UiCard>

        <UiCard title="Verification" description="New members press Verify on a panel to get a role. Hide your channels from @everyone and show them to the verified role, and bots/raiders can't see anything.">
            <UiToggle v-model="draft.verification.enabled" label="Enable verification" />
            <template v-if="draft.verification.enabled">
                <UiField label="Verified role">
                    <UiRoleSelect v-model="draft.verification.roleId" :roles="overview!.roles" assignable-only placeholder="Pick the role to give…" />
                </UiField>
                <div class="grid gap-2 sm:grid-cols-2">
                    <label v-for="m in methods" :key="m.value" class="cursor-pointer rounded-lg border p-3 text-sm" :class="draft.verification.method === m.value ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700'">
                        <input v-model="draft.verification.method" type="radio" :value="m.value" class="sr-only" />
                        <span class="block font-medium">{{ m.label }}</span>
                        <span class="mt-0.5 block text-zinc-400">{{ m.description }}</span>
                    </label>
                </div>
                <UiField label="Panel text"><textarea v-model="draft.verification.panelMessage" rows="3" maxlength="1500" class="input" /></UiField>
                <p class="text-sm text-zinc-400">After saving, run <code>/verify panel</code> in the channel new members can see.</p>
            </template>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
const { overview, config, save } = useGuildDashboard();

const { draft, dirty, reset } = useDraft(() => config.value && {
    antiRaid: config.value.settings.antiRaid,
    verification: config.value.settings.verification
});
const saving = ref(false);

const raidActions = [
    { value: "lockdown", label: "Lock down", description: "Highest verification level and new joiners are kicked (with a DM) until it ends" },
    { value: "alert", label: "Alert only", description: "Post an alert for your staff and do nothing else" }
] as const;
const methods = [
    { value: "button", label: "Button", description: "One click. Stops most bots" },
    { value: "captcha", label: "Captcha", description: "Type the characters from an image. Stops nearly all bots" }
] as const;

async function submit() {
    saving.value = true;
    await save({ settings: draft.value }).catch(() => null);
    saving.value = false;
}
</script>
