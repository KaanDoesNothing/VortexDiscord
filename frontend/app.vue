<template>
  <Html data-theme="night" class="font-sans"></Html>
  <NuxtLoadingIndicator></NuxtLoadingIndicator>
  <NuxtLayout>
    <Navbar></Navbar>
    <NuxtPage></NuxtPage>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { useGeneralStore } from "@/stores/general";
const generalStore = useGeneralStore();
await generalStore.fetchClientInfo();
await generalStore.fetchStatistics();
</script>