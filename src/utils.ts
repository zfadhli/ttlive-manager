// src/utils.ts
/**
 * Small pure utilities used across the project.
 *
 * Keep functions tiny and testable.
 */

import { readFileSync } from "node:fs";

export function padRight(input: string, width: number): string {
    return input.padEnd(width);
}

/**
 * Sleep utility - resolves after ms milliseconds.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

export function readFile(filePath: string): string[] {
    return readFileSync(filePath, "utf-8")
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("#"));
}

export function formatElapsed(start: Date): string {
    const diff = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
    const hrs = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}
