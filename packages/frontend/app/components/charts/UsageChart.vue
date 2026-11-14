<!--
    Commands used per day (one series, so no legend; the card title names it).
    Thin bars anchored to the baseline, a recessive grid, a hover tooltip per bar,
    and a visually-hidden table for screen readers.
-->
<template>
    <div class="relative">
        <svg :viewBox="`0 0 ${W} ${H}`" class="h-48 w-full" role="img" :aria-label="`Commands used per ${unit}, last ${data.length} ${unit}s`" @mouseleave="hover = null">
            <!-- Gridlines + y labels -->
            <g v-for="tick in ticks" :key="tick">
                <line :x1="PAD_L" :x2="W" :y1="y(tick)" :y2="y(tick)" class="stroke-zinc-800" stroke-width="1" />
                <text :x="PAD_L - 6" :y="y(tick) + 4" text-anchor="end" class="fill-zinc-500 text-[11px]">{{ tick }}</text>
            </g>

            <g v-for="(d, i) in data" :key="d.day">
                <!-- Bar: rounded top only, 2px gap between neighbours. -->
                <path v-if="d.uses > 0" :d="barPath(i, d.uses)" :fill="hover === i ? '#9896f8' : '#7c7af5'" />
                <!-- Hit target taller and wider than the bar. -->
                <rect :x="PAD_L + i * slot" :y="0" :width="slot" :height="H - PAD_B" fill="transparent" @mouseenter="hover = i" @focus="hover = i" tabindex="0" :aria-label="`${label(d.day)}: ${d.uses}`" />
                <text v-if="i % Math.ceil(data.length / 8) === 0" :x="PAD_L + i * slot + slot / 2" :y="H - 6" text-anchor="middle" class="fill-zinc-500 text-[11px]">{{ shortLabel(d.day) }}</text>
            </g>
        </svg>

        <div
            v-if="hovered"
            class="pointer-events-none absolute -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs shadow-lg"
            :style="{ left: `${((PAD_L + hovered.index * slot + slot / 2) / W) * 100}%`, top: '0' }"
        >
            <div class="text-zinc-400">{{ label(hovered.day) }}</div>
            <div class="font-semibold text-zinc-100">{{ hovered.uses.toLocaleString() }} commands</div>
        </div>

        <table class="sr-only">
            <caption>Commands used per day</caption>
            <tr><th>Day</th><th>Commands</th></tr>
            <tr v-for="d in data" :key="d.day"><td>{{ d.day }}</td><td>{{ d.uses }}</td></tr>
        </table>
    </div>
</template>

<script setup lang="ts">
// `day` is "YYYY-MM-DD" (daily) or "YYYY-MM-DDTHH" (hourly, with unit="hour").
const props = withDefaults(defineProps<{ data: { day: string; uses: number }[]; unit?: "day" | "hour" }>(), { unit: "day" });

const W = 600, H = 192, PAD_L = 32, PAD_B = 22, GAP = 2, R = 4;
const hover = ref<number | null>(null);

const slot = computed(() => (W - PAD_L) / Math.max(1, props.data.length));

// The bar under the cursor (for the tooltip).
const hovered = computed(() => {
    const d = hover.value === null ? undefined : props.data[hover.value];
    return d ? { ...d, index: hover.value! } : null;
});

// Round the axis max up to a "nice" number and use 4 gridlines.
const max = computed(() => {
    const raw = Math.max(4, ...props.data.map((d) => d.uses));
    const step = 10 ** Math.floor(Math.log10(raw));
    return Math.ceil(raw / step) * step;
});
const ticks = computed(() => [0, 1, 2, 3, 4].map((i) => Math.round((max.value / 4) * i)));
const y = (v: number) => (H - PAD_B) - (v / max.value) * (H - PAD_B - 8);

function barPath(i: number, v: number) {
    const w = Math.min(28, slot.value - GAP * 2);
    const x = PAD_L + i * slot.value + (slot.value - w) / 2;
    const top = y(v), base = y(0);
    const r = Math.min(R, w / 2, base - top);
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

const toDate = (key: string) => new Date(props.unit === "hour" ? `${key}:00:00Z` : `${key}T00:00:00Z`);
const label = (key: string) => props.unit === "hour"
    ? toDate(key).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })
    : toDate(key).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const shortLabel = (key: string) => props.unit === "hour"
    ? toDate(key).toLocaleTimeString(undefined, { hour: "2-digit" })
    : toDate(key).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
</script>
