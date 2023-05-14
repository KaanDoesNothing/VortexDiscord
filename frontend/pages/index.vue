<template>
    <div class="flex justify-center my-40">
        <div class="flex flex-col">
            <label class="text-4xl">{{ generalStore.client_info.username }}</label>
            <label class="text-2xl">A multi-purpose Discord bot</label>
            <label class="text-2xl">Designed with simplicity in mind</label>

            <br>
            <a class="underline animate-bounce" :href="`https://discord.com/oauth2/authorize?client_id=${generalStore.client_info.id}&scope=bot&permissions=1099511627767`">Click here to get started!</a>
        </div>
    </div>
</template>

<script type="lang" setup>
    import { useGeneralStore } from "@/stores/general";

    const generalStore = useGeneralStore();
</script>