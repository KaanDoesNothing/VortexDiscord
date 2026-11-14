<template>
    <div>
        <h1 class="text-3xl font-bold">Commands</h1>
        <p class="mt-2 text-zinc-400">Every command works as a slash command (<code>/</code>) or with the server prefix (default <code>-&gt;</code>).</p>

        <p v-if="error" class="mt-6 rounded-lg border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">
            Couldn't load commands. Is the client running?
        </p>

        <template v-else-if="commands">
            <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="category in categories"
                        :key="category"
                        type="button"
                        class="rounded-full px-4 py-1.5 text-sm font-medium transition"
                        :class="category === active
                            ? 'bg-brand-500 text-white'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'"
                        @click="active = category"
                    >
                        {{ category }}
                    </button>
                </div>

                <input
                    v-model="search"
                    type="search"
                    placeholder="Search commands…"
                    class="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-brand-500 sm:w-64"
                />
            </div>

            <div class="mt-6 overflow-hidden rounded-xl border border-zinc-800">
                <table class="w-full text-left text-sm">
                    <thead class="bg-zinc-900 text-zinc-400">
                        <tr>
                            <th class="px-4 py-3 font-medium">Command</th>
                            <th class="px-4 py-3 font-medium">Description</th>
                            <th v-if="search" class="hidden px-4 py-3 font-medium sm:table-cell">Category</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-800">
                        <tr v-for="command in visible" :key="command.name" class="hover:bg-zinc-900/60">
                            <td class="px-4 py-3 font-mono font-semibold text-brand-400">/{{ command.name }}</td>
                            <td class="px-4 py-3 text-zinc-300">{{ command.description }}</td>
                            <td v-if="search" class="hidden px-4 py-3 text-zinc-500 sm:table-cell">{{ command.category }}</td>
                        </tr>
                        <tr v-if="!visible.length">
                            <td colspan="3" class="px-4 py-8 text-center text-zinc-500">No commands found.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
useHead({ title: "Commands" });

const { data: commands, error } = await useCommands();

const categories = computed(() => [...new Set((commands.value ?? []).map((c) => c.category))].sort());
// Preselect a category from the URL (links from the home page), else the first one.
const route = useRoute();
const active = ref(categories.value.find((c) => c === route.query.category) ?? categories.value[0] ?? "");
const search = ref("");

// Searching looks across all categories; otherwise show the selected one.
const visible = computed(() => {
    const list = commands.value ?? [];
    const query = search.value.trim().toLowerCase();

    if (query) {
        return list.filter((c) => c.name.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query));
    }

    return list.filter((c) => c.category === active.value);
});
</script>
