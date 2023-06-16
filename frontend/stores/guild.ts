// import { defineStore } from "pinia";

// export const useGuildSession = defineStore("guild", {
//     state: () => {
//         return {}
//     },
//     actions: {
//         async setupGuild(guild_id: string) {
//             const config = useRuntimeConfig();
//             const key = useCookie("key").value;

//             if(!key) return;

//             const res = await $fetch<any>(`${config.public.api}/authentication/user`, {body: {key}, method: "POST"}).catch(err => console.log(err));

//             if(res.error) {
//                 useCookie("key").value = undefined;
//             }else {
//                 this.user = res;
//             }
//         }
//     }
// })