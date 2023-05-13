// import { ICacheAdapter } from "harmony/mod.ts";
// import { CacheTable } from "./Database.ts";

// export class VortexCacheAdapter implements ICacheAdapter {
//     async get<T>(type: string, key: string) {
//         const row = await CacheTable.findOne({type, key});
//         if(row) return row.toObject().value;
//     }

//     async set<T>(type: string, key: string, value: T, expire?: number): Promise<void> {
//         const row = await CacheTable.findOne({type, key});

//         if(row) {
//             row.value = value;
//             await row.save();
//         }else {
//             (await CacheTable.create({type, key, value})).save();
//         }

//         if(expire) {
//             setTimeout(() => {

//             })
//         }

//         return;
//     }
// }