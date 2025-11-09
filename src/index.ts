import { CLI } from "./cli";

async function main(): Promise<void> {
	const cli = new CLI();

	// Graceful immediate exit on Ctrl+C
	const onSigint = (): void => {
		try {
			cli.getManager().stopAll();
		} catch {}
		console.log("\nInterrupted — stopped downloads and exiting.");
		process.exit(0);
	};

	process.on("SIGINT", onSigint);

	try {
		await cli.start();
	} catch (err) {
		console.error("Fatal error:", err);
		process.exitCode = 1;
	} finally {
		process.off("SIGINT", onSigint);
	}
}

main();
