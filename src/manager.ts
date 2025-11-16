import { spawn } from "bun";
import EventEmitter from "eventemitter3";
import { CONFIG } from "./config.ts";
import { drainStream } from "./streams";
import type { Config, Download, Status } from "./types.ts";
import { rid, sleep } from "./utils.ts";

export class DownloadManager extends EventEmitter {
	private downloads = new Map<string, Download>();
	private autoRestartInterval: NodeJS.Timeout | null = null;

	startAutoRestart(config: Config): void {
		if (this.autoRestartInterval) return;

		this.autoRestartInterval = setInterval(() => {
			this.checkAndRestartOldDownloads(config);
		}, 60_000); // Check every minute
	}

	stopAutoRestart(): void {
		if (this.autoRestartInterval) {
			clearInterval(this.autoRestartInterval);
			this.autoRestartInterval = null;
		}
	}

	private async checkAndRestartOldDownloads(config: Config): Promise<void> {
		const now = Date.now();
		const maxDuration = 30 * 60_000;

		for (const download of this.downloads.values()) {
			if (download.status === "downloading") {
				const elapsed = now - download.startTime.getTime();
				if (elapsed > maxDuration) {
					await this.restart(download.id, config);

					// Force status change event to trigger immediate render
					this.emit("statusChange", {
						id: download.id,
						user: download.user,
						status: "downloading",
					});
				}
			}
		}
	}

	async start(user: string, config: Config): Promise<string> {
		const id = rid();

		const proc = this.spawnProcess(user, config);
		const download = this.createDownload(id, user, config.outputPath, proc);

		this.downloads.set(id, download);
		// biome-ignore lint/style/noNonNullAssertion: This value is guaranteed to be non-null by external logic.
		const dl = this.downloads.get(id)!;
		dl.status = "waiting";
		this.emitStatus(id, dl.user, "waiting");

		await sleep(CONFIG.delay);

		dl.status = "downloading";
		this.setupHandlers(proc, id, user);
		this.emitStatus(id, user, "downloading");
		return id;
	}

	async stop(id: string): Promise<boolean> {
		console.log(`Stopping download ${id}`);
		const dl = this.downloads.get(id);
		if (!dl) return false;

		await this.killProcess(dl.process);

		dl.status = "stopped";
		this.emitStatus(id, dl.user, "stopped");
		await sleep(600);
		return true;
	}

	async restart(id: string, config: Config): Promise<string | null> {
		const dl = this.downloads.get(id);
		if (!dl) return null;

		await this.killProcess(dl.process);

		const proc = this.spawnProcess(dl.user, config);

		dl.process = proc;
		dl.status = "waiting";
		this.emitStatus(id, dl.user, "waiting");
		await sleep(CONFIG.delay);

		this.setupHandlers(proc, id, dl.user);
		dl.status = "downloading";
		dl.startTime = new Date();
		this.emitStatus(id, dl.user, "downloading");
		return id;
	}

	getAll(): Download[] {
		return Array.from(this.downloads.values());
	}

	getRunning(): Download[] {
		return this.getAll().filter((d) => d.status === "downloading");
	}

	stopAll(): void {
		this.getRunning().forEach((d) => {
			this.stop(d.id);
		});
	}

	private spawnProcess(user: string, config: Config): ReturnType<typeof spawn> {
		return spawn({
			cmd: [
				"bash",
				"-c",
				`${config.commandPrefix} -output "${config.outputPath}" -user "${user}"`,
			],
			stdout: "pipe",
			stderr: "pipe",
		});
	}

	private createDownload(
		id: string,
		user: string,
		outputPath: string,
		proc: ReturnType<typeof spawn>,
	): Download {
		return {
			id,
			user,
			status: "downloading",
			process: proc,
			startTime: new Date(),
			outputPath,
		};
	}

	private async killProcess(
		proc: ReturnType<typeof spawn> | undefined,
	): Promise<void> {
		if (!proc) return;
		try {
			proc.kill();
			await sleep(600);
		} catch {
			/* continue */
		}
	}

	private setupHandlers(
		proc: ReturnType<typeof spawn>,
		id: string,
		user: string,
	): void {
		proc.exited
			.then((code) => {
				const dl = this.downloads.get(id);
				if (!dl) return;
				if (dl.status === "downloading") {
					dl.status = code === 0 ? "completed" : "error";
					this.emitStatus(id, user, dl.status);
				}

				// Ensure process is killed after completion
				this.killProcess(proc).catch(() => {
					/* ignore */
				});
			})
			.catch((err: unknown) => {
				const dl = this.downloads.get(id);
				if (!dl) return;
				dl.status = "error";
				this.emitStatus(id, user, "error");
				console.error(`[${id}] process error: ${String(err)}`);
				this.killProcess(proc).catch(() => {
					/* ignore */
				});
			});

		if (proc.stdout) {
			void drainStream(proc.stdout).catch(() => {
				/* ignore */
			});
		}
		if (proc.stderr) {
			void drainStream(proc.stderr).catch(() => {
				/* ignore */
			});
		}
	}

	private emitStatus(id: string, user: string, status: Status): void {
		this.emit("statusChange", { id, user, status });
	}
}
