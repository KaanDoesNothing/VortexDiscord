import {config as env} from "dotenv/mod.ts";
import {create, verify} from "https://deno.land/x/djwt/mod.ts";
import { getCryptoKey } from "../crypto.ts";

export const createJWT = async (data: {user_id: string, createdAt: number}) => {
    try {
        const key = await create({alg: "HS512", typ: "JWT"}, data, await getCryptoKey());

        return key;
    }catch(err) {
        console.log(err);
    }
}

export const verifyJWT = async (jwt: string) => {
    return await verify(jwt, await getCryptoKey());
}