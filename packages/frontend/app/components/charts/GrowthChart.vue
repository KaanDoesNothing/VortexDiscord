<!--
    Joins vs leaves per day: two series as paired thin bars, so a legend is shown and each bar has a tooltip.
    Colors: joins = brand purple, leaves = coral (#d9685a); both validated against the dark surface.
-->
<template>
    <div class="relative">
        <div class="mb-3 flex gap-4 text-xs text-zinc-400">
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-[#7c7af5]" />Joins ({{ totals.joins }})</span>
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-[#d9685a]" />Leaves ({{ totals.leaves }})</span>
        </div>
        <svg :viewBox="`0 0 ${W} ${H}`" class="h-48 w-full" role="img" aria-label="Member joins and leaves per day" @mouseleave="hover = null">
            <g v-for="tick in ticks" :key="tick">
                <line :x1="PAD_L" :x2="W" :y1="y(tick)" :y2="y(tick)" class="stroke-zinc-800" />
                <text :x="PAD_L - 6" :y="y(tick) + 4" text-anchor="end" class="fill-zinc-500 text-[11px]">{{ tick }}</text>
            </g>
            <g v-for="(d, i) in data" :key="d.day">
                <rect v-if="d.joins" :x="x(i)" :y="y(d.joins)" :width="bw" :height="y(0) - y(d.joins)" rx="2" fill="#7c7af5" :opacity="hover === null || hover === i ? 1 : 0.5" />
                <rect v-if="d.leaves" :x="x(i) + bw + 2" :y="y(d.leaves)" :width="bw" :height="y(0) - y(d.leaves)" rx="2" fill="#d9685a" :opacity="hover === null || hover === i ? 1 : 0.5" />
                <rect :x="PAD_L + i * slot" y="0" :width="slot" :height="H - PAD_B" fill="transparent" @mouseenter="hover = i" />
                <text v-if="i % labelEvery === 0" :x="PAD_L + i * slot + slot / 2" :y="H - 6" text-anchor="middle" class="fill-zinc-500 text-[11px]">{{ short(d.day) }}</text>
            </g>
        </svg>
        <div v-if="hovered" class="pointer-events-none absolute top-6 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs shadow-lg" :style="{ left: `${((PAD_L + hovered.i * slot + slot / 2) / W) * 100}%` }">
            <div class="text-zinc-400">{{ long(hovered.day) }}</div>
            <div class="text-zinc-100">+{{ hovered.joins }} joined · −{{ hovered.leaves }} left</div>
        </div>
        <table class="sr-only">
            <caption>Member joins and leaves per day</caption>
            <tr><th>Day</th><th>Joins</th><th>Leaves</th></tr>
            <tr v-for="d in data" :key="d.day"><td>{{ d.day }}</td><td>{{ d.joins }}</td><td>{{ d.leaves }}</td></tr>
        </table>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { day: string; joins: number; leaves: number }[] }>();

const W = 600, H = 192, PAD_L = 32, PAD_B = 22;
const hover = ref<number | null>(null);
const slot = computed(() => (W - PAD_L) / Math.max(1, props.data.length));
const bw = computed(() => Math.max(2, Math.min(12, (slot.value - 6) / 2)));
const x = (i: number) => PAD_L + i * slot.value + (slot.value - (bw.value * 2 + 2)) / 2;
const labelEvery = computed(() => Math.ceil(props.data.length / 8));

const max = computed(() => {
    const raw = Math.max(4, ...props.data.flatMap((d) => [d.joins, d.leaves]));
    const step = 10 ** Math.floor(Math.log10(raw));
    return Math.ceil(raw / step) * step;
});
const ticks = computed(() => [0, 1, 2, 3, 4].map((i) => Math.round((max.value / 4) * i)));
const y = (v: number) => (H - PAD_B) - (v / max.value) * (H - PAD_B - 8);

const totals = computed(() => props.data.reduce((t, d) => ({ joins: t.joins + d.joins, leaves: t.leaves + d.leaves }), { joins: 0, leaves: 0 }));
const hovered = computed(() => (hover.value === null || !props.data[hover.value] ? null : { ...props.data[hover.value]!, i: hover.value }));

const short = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const long = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
</script>
