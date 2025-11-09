// src/uid.ts
/**
 * URL-safe, readable, non-confusing id generator.
 *
 * Uses rejection sampling with a secure RNG when available.
 */

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const CHARSET_SIZE = CHARSET.length;
const MAX_ACCEPTABLE = Math.floor(256 / CHARSET_SIZE) * CHARSET_SIZE;

/**
 * Selects a secure random-fill implementation.
 */
function getRandomValues(): (arr: Uint8Array) => void {
    if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
        return (arr: Uint8Array) =>
            (globalThis as { crypto: Crypto }).crypto.getRandomValues(arr);
    }
    // Bun and Node fallback
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const crypto = require("node:crypto");
        return (arr: Uint8Array) => crypto.randomFillSync(arr);
    } catch {
        throw new Error("No secure random number generator available");
    }
}

/**
 * Returns one unbiased random char from CHARSET.
 */
function getRandomChar(): string {
    const rnd = getRandomValues();
    const buf = new Uint8Array(1);
    while (true) {
        rnd(buf);
        const v = buf[0] as number;
        if (v < MAX_ACCEPTABLE) {
            return CHARSET.charAt(v % CHARSET_SIZE);
        }
    }
}

/**
 * Generate a readable uid.
 * @param length length of the id (default 8)
 */
export function uid(length = 8): string {
    if (!Number.isInteger(length) || length <= 0) {
        throw new Error("uid length must be a positive integer");
    }
    let out = "";
    for (let i = 0; i < length; i++) out += getRandomChar();
    return out;
}
