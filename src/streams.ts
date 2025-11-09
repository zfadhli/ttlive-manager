// src/streams.ts
/**
 * Stream utilities for handling both AsyncIterable and Web ReadableStream.
 */

function isAsyncIterable(v: unknown): v is AsyncIterable<Uint8Array> {
    return (
        v !== null &&
        typeof v === "object" &&
        typeof (
            v as unknown as {
                [Symbol.asyncIterator]: () => AsyncIterator<Uint8Array>;
            }
        )[Symbol.asyncIterator] === "function"
    );
}

function isWebReadableStream(v: unknown): v is ReadableStream<Uint8Array> {
    return (
        v !== null &&
        typeof v === "object" &&
        typeof (v as { getReader: unknown }).getReader === "function"
    );
}

export async function drainStream(stream: unknown): Promise<void> {
    if (isAsyncIterable(stream)) {
        for await (const _chunk of stream) {
            /* consume */
        }
        return;
    }

    if (isWebReadableStream(stream)) {
        const reader = stream.getReader();
        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                // eslint-disable-next-line no-await-in-loop
                const res = await reader.read();
                if (res.done) break;
            }
        } finally {
            try {
                reader.releaseLock?.();
            } catch {
                /* ignore */
            }
        }
    }
}
