<template>
  <Html data-theme="night" class="font-sans">
    <Title>{{ generalStore.client_info?.username }}</Title>
    <Link rel="icon" type="image/png" :href="generalStore.client_info?.avatar"></Link>
  </Html>
  <NuxtLoadingIndicator></NuxtLoadingIndicator>
  <NuxtLayout>
    <NuxtPage></NuxtPage>
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { useGeneralStore } from "@/stores/general";
import { useSessionStore } from "@/stores/session";

const generalStore = useGeneralStore();
const sessionStore = useSessionStore();

await generalStore.fetchClientInfo();
await generalStore.fetchStatistics();

const config = useRuntimeConfig();

const route = useRoute();
const router = useRouter();

if(route.query.code) {
  const res = await $fetch<any>(`${config.public.api}/authentication`, {body: {code: route.query.code}, method: "POST"});
  
  if(res.key) {
    useCookie("key").value = res.key;
    sessionStore.$patch({key: res.key});
  }

  await router.push("/");
}

await sessionStore.fetchUser();
</script>