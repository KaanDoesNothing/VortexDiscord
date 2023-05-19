try {
    const existing = await Deno.readTextFile(`${Deno.cwd()}/cryptokey.json`);
}catch(_err) {
    const key = await crypto.subtle.generateKey(
        { name: "HMAC", hash: "SHA-512" },
        true,
        ["sign", "verify"],
    );
    const exported = await crypto.subtle.exportKey("jwk", key);

    await Deno.writeTextFile(`${Deno.cwd()}/cryptokey.json`, JSON.stringify(exported));
}

export const getCryptoKey = async () => {
    const existing = await Deno.readTextFile(`${Deno.cwd()}/cryptokey.json`);
    const imported = await crypto.subtle.importKey("jwk", JSON.parse(existing), { name: "HMAC", hash: "SHA-512" }, true, ["sign", "verify"]);
    return imported;
}