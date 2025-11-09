// src/index.ts
/**
 * Entrypoint - start interactive CLI and handle signals.
 *
 * Adds immediate exit on Ctrl+C (SIGINT) with graceful cleanup:
 * - stops all running downloads
 * - prints a short message and exits with code 0
 */

import { CLI } from "./cli";

async function main(): Promise<void> {
    const cli = new CLI();

    // Graceful immediate exit on Ctrl+C
    const onSigint = (): void => {
        try {
            // stop all running child processes managed by the manager
            cli.getManager().stopAll();
        } catch {
            // ignore errors during shutdown
        }
        // Give a moment for child processes to receive SIGTERM
        // then exit immediately.
        // Note: using sync console to ensure message is visible.
        console.log("\nInterrupted — stopped downloads and exiting.");
        // Force immediate exit
        process.exit(0);
    };

    process.on("SIGINT", onSigint);

    try {
        await cli.start();
    } catch (err) {
        console.error("Fatal error:", err);
        process.exitCode = 1;
    } finally {
        // remove handler to avoid duplicate handling if process continues
        process.off("SIGINT", onSigint);
    }
}

main();
