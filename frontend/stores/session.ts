import { defineStore } from "pinia";

interface iSessionStore {
    user?: any;
    key?: string;
}

export const useSessionStore = defineStore("session", {
    state: (): iSessionStore => {
        return {}
    },
    actions: {
        async fetchUser() {
            const config = useRuntimeConfig();
            const key = useCookie("key").value;

            if(!key) return;

            const res = await $fetch<any>(`${config.public.api}/authentication/user`, {body: {key}, method: "POST"}).catch(err => console.log(err));

            if(res.error) {
                useCookie("key").value = undefined;
            }else {
                this.user = res;
            }
        }
    }
})