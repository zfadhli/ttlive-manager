// src/manager.ts
import { spawn } from "bun";
import EventEmitter from "eventemitter3";
import { drainStream } from "./streams";
import type { Download, Status } from "./types.ts";
import { rid, sleep } from "./utils.ts";

export interface ManagerConfig {
	scriptDirectory: string;
	delayMin: number;
	delayMax: number;
}

export class DownloadManager extends EventEmitter {
	private downloads = new Map<string, Download>();
	private config: ManagerConfig;

	constructor(config: ManagerConfig) {
		super();
		this.config = config;
	}

	async start(
		user: string,
		outputDir: string,
		opts?: { commandPrefix?: string; isBatch?: boolean },
	): Promise<string> {
		const { commandPrefix = "", isBatch = false } = opts ?? {};
		const id = rid();

		if (isBatch) {
			await this.applyBatchDelay(id, user);
		}

		const proc = this.spawnProcess(user, outputDir, commandPrefix);
		const download = this.createDownload(id, user, outputDir, proc);

		this.downloads.set(id, download);
		this.setupHandlers(proc, id, user);
		this.emitStatus(id, user, "running");

		return id;
	}

	stop(id: string): boolean {
		const dl = this.downloads.get(id);
		if (!dl) return false;

		try {
			dl.process?.kill();
		} catch {
			/* ignore */
		}

		dl.status = "stopped";
		this.emitStatus(id, dl.user, "stopped");
		return true;
	}

	async restart(
		id: string,
		opts?: { commandPrefix?: string },
	): Promise<string | null> {
		const dl = this.downloads.get(id);
		if (!dl) return null;

		await this.killProcess(dl.process);

		const commandPrefix = opts?.commandPrefix ?? "";
		const proc = this.spawnProcess(dl.user, dl.outputDir, commandPrefix);

		dl.process = proc;
		dl.status = "running";
		dl.startTime = new Date();

		this.setupHandlers(proc, id, dl.user);
		this.emitStatus(id, dl.user, "running");

		return id;
	}

	getAll(): Download[] {
		return Array.from(this.downloads.values());
	}

	getRunning(): Download[] {
		return this.getAll().filter((d) => d.status === "running");
	}

	stopAll(): void {
		this.getRunning().forEach((d) => {
			this.stop(d.id);
		});
	}

	private async applyBatchDelay(id: string, user: string): Promise<void> {
		const { delayMin, delayMax } = this.config;
		const delay = Math.random() * (delayMax - delayMin) + delayMin;
		const delaySec = Math.round(delay / 1000);
		console.log(`\n[${id}] ⏳ delaying ${delaySec}s before @${user}`);
		await sleep(delay);
		console.log(`[${id}] ✅ started download for @${user}`);
	}

	private spawnProcess(
		user: string,
		outputDir: string,
		commandPrefix: string,
	): ReturnType<typeof spawn> {
		return spawn({
			cmd: [
				"bash",
				"-c",
				`cd ${this.config.scriptDirectory} && ${commandPrefix} -output "${outputDir}" -user "${user}"`,
			],
			stdout: "pipe",
			stderr: "pipe",
		});
	}

	private createDownload(
		id: string,
		user: string,
		outputDir: string,
		proc: ReturnType<typeof spawn>,
	): Download {
		return {
			id,
			user,
			status: "running",
			process: proc,
			startTime: new Date(),
			outputDir,
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
				if (dl.status === "running") {
					dl.status = code === 0 ? "completed" : "error";
					this.emitStatus(id, user, dl.status);
				}
			})
			.catch((err: unknown) => {
				const dl = this.downloads.get(id);
				if (!dl) return;
				dl.status = "error";
				this.emitStatus(id, user, "error");
				console.error(`[${id}] process error: ${String(err)}`);
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
