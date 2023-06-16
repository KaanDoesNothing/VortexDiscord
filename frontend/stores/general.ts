import { defineStore } from "pinia";

interface iGeneralStore {
    client_info?: {
        id: string;
        username: string;
        avatar: string;
    },
    statistics?: {
        guilds: number;
        channels: number;
        users: number;
    }
}

export const useGeneralStore = defineStore("general", {
    state: (): iGeneralStore => {
        return {}
    },
    actions: {
        async fetchClientInfo() {
            const config = useRuntimeConfig();

            this.client_info = await $fetch(`${config.public.api}/information/client`);
        },
        async fetchStatistics() {
            const config = useRuntimeConfig();
            
            this.statistics = await $fetch(`${config.public.api}/information/statistics`);
        }
    }
})