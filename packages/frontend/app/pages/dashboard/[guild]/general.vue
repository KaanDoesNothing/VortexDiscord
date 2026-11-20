<!-- General: prefix, branding, how replies behave, command aliases, which channels commands work in, and copying settings. -->
<template>
    <div v-if="draft" class="space-y-6">
        <h1 class="text-2xl font-bold">General</h1>

        <UiCard title="Prefix" description="Used for text commands, e.g. ->help. Slash commands always work.">
            <UiField label="Prefix" hint="1 to 10 characters">
                <input v-model="draft.prefix" maxlength="10" class="input font-mono sm:w-48" />
            </UiField>
        </UiCard>

        <UiCard title="Branding" description="Make the bot's replies match your server: every embed uses this color and footer.">
            <div class="grid gap-4 sm:grid-cols-[auto_1fr]">
                <UiField label="Embed color">
                    <div class="flex items-center gap-2">
                        <input :value="draft.branding.color || '#6d6af0'" type="color" class="h-10 w-16 cursor-pointer rounded border border-zinc-800 bg-zinc-950" @input="draft.branding.color = ($event.target as HTMLInputElement).value" />
                        <button v-if="draft.branding.color" type="button" class="text-xs text-zinc-500 hover:text-zinc-300" @click="draft.branding.color = ''">Reset</button>
                    </div>
                </UiField>
                <UiField label="Footer text" hint="Optional, shown under embeds that don't have their own footer.">
                    <input v-model="draft.branding.footer" maxlength="200" class="input" placeholder="e.g. My Server • be nice" />
                </UiField>
            </div>
            <UiEmbedPreview content="" :embed="{ title: 'Example reply', description: 'This is how the bot\'s embeds will look.', color: draft.branding.color || '#6d6af0', footer: draft.branding.footer }" />
        </UiCard>

        <UiCard title="Replies">
            <UiField label="Private replies for these categories" hint="Slash commands in these groups answer so only the person who used them sees it. Keeps busy channels clean.">
                <UiMultiPicker v-model="draft.replies.privateCategories" :options="categoryOptions" noun="category" :max="20" />
            </UiField>
            <UiToggle v-model="draft.replies.deleteInvocation" label="Delete prefix command messages" description="Removes the member's ->command message after it runs (needs Manage Messages)." />
        </UiCard>

        <UiCard title="Aliases" description="Extra names for prefix commands, e.g. ->b for ->ban. Slash commands keep their names.">
            <div v-for="(a, i) in draft.aliases" :key="i" class="flex items-center gap-2 text-sm">
                <span class="font-mono text-zinc-500">{{ draft.prefix }}</span>
                <input v-model="a.alias" maxlength="32" class="input w-36 font-mono" placeholder="alias" />
                runs
                <select v-model="a.command" class="input flex-1">
                    <option value="" disabled>Pick a command…</option>
                    <option v-for="c in commandNames" :key="c" :value="c">{{ c }}</option>
                </select>
                <button type="button" class="btn-danger" @click="draft.aliases.splice(i, 1)">Remove</button>
            </div>
            <button v-if="draft.aliases.length < 50" type="button" class="btn-ghost" @click="draft.aliases.push({ alias: '', command: '' })">+ Add alias</button>
        </UiCard>

        <UiCard title="Command channels" description="Limit where members can use commands. The /command command always works, so admins can't lock themselves out.">
            <div class="grid gap-2 sm:grid-cols-3">
                <label v-for="mode in modes" :key="mode.value" class="cursor-pointer rounded-lg border p-3 text-sm transition" :class="draft.commandChannels.mode === mode.value ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-800 hover:border-zinc-700'">
                    <input v-model="draft.commandChannels.mode" type="radio" :value="mode.value" class="sr-only" />
                    <span class="block font-medium">{{ mode.label }}</span>
                    <span class="mt-0.5 block text-zinc-400">{{ mode.description }}</span>
                </label>
            </div>
            <UiField v-if="draft.commandChannels.mode !== 'all'" :label="draft.commandChannels.mode === 'allow' ? 'Allowed channels' : 'Blocked channels'">
                <UiMultiPicker v-model="draft.commandChannels.channelIds" :options="channelOptions" noun="channel" />
            </UiField>
        </UiCard>

        <UiCard title="Copy settings from another server" description="Set this server up like one you already run. Channels and roles that don't exist here are cleared; everything else is copied.">
            <div class="flex flex-wrap gap-2">
                <select v-model="copyFrom" class="input flex-1">
                    <option value="">Pick a server…</option>
                    <option v-for="g in otherGuilds" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
                <button type="button" class="btn-primary" :disabled="!copyFrom || copying" @click="copySettings">{{ copying ? "Copying…" : "Copy settings" }}</button>
            </div>
            <p class="text-xs text-zinc-500">You can also back up settings as a file with <code>/settings export</code> and load them with <code>/settings import</code>.</p>
        </UiCard>

        <UiSaveBar :dirty="dirty" :saving="saving" @save="submit" @reset="reset" />
    </div>
</template>

<script setup lang="ts">
import type { CommandInfo } from "~/composables/useApi";
import type { GuildConfig, ManageableGuild } from "~/types/dashboard";

const { guildId, overview, config, save } = useGuildDashboard();

// One draft for every card on this page.
const { draft, dirty, reset } = useDraft(() => config.value && {
    prefix: config.value.prefix,
    branding: config.value.settings.branding,
    replies: config.value.settings.replies,
    aliases: config.value.settings.aliases,
    commandChannels: config.value.settings.commandChannels
});
const saving = ref(false);

const modes = [
    { value: "all", label: "Everywhere", description: "Commands work in every channel" },
    { value: "allow", label: "Only in…", description: "Only in the channels you pick" },
    { value: "deny", label: "Everywhere except…", description: "Block the channels you pick" }
] as const;

const channelOptions = computed(() => (overview.value?.channels ?? []).map((c) => ({ id: c.id, label: `#${c.name}` })));

const { data: commands } = await useFetch<CommandInfo[]>("/api/commands", { server: false });
const commandNames = computed(() => (commands.value ?? []).map((c) => c.name));
const categoryOptions = computed(() => [...new Set((commands.value ?? []).map((c) => c.category.toLowerCase()))].sort().map((c) => ({ id: c, label: c[0]!.toUpperCase() + c.slice(1) })));

const { data: guilds } = await useFetch<ManageableGuild[]>("/api/auth/guilds", { server: false });
const otherGuilds = computed(() => (guilds.value ?? []).filter((g) => g.botPresent && g.id !== guildId.value));
const copyFrom = ref("");
const copying = ref(false);

async function copySettings() {
    const source = otherGuilds.value.find((g) => g.id === copyFrom.value);
    if (!source || !confirm(`Replace this server's settings with ${source.name}'s?`)) return;
    copying.value = true;
    try {
        const updated = await api<GuildConfig>(`/guilds/${guildId.value}/settings/copy`, { method: "POST", body: { from: source.id } });
        if (overview.value) overview.value.config = updated;
        useToast().show(`Copied settings from ${source.name}`);
    } catch (e) {
        useToast().show(apiError(e, "Couldn't copy settings"), "error");
    } finally {
        copying.value = false;
    }
}

async function submit() {
    if (!draft.value) return;
    saving.value = true;
    const { prefix, ...settings } = draft.value;
    // Half-filled alias rows are skipped rather than failing the save.
    settings.aliases = settings.aliases.filter((a) => a.alias.trim() && a.command);
    await save({ prefix, settings }).catch(() => null);
    saving.value = false;
}
</script>
