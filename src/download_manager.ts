import { spawn } from "bun";
import mitt from "mitt";
import { CONFIG } from "./config";
import type { Download, Events, Input } from "./types";
import { delay } from "./utils";

export class DownloadManager {
	private downloads = new Map<number, Download>();
	private nextId = 1;
	public readonly emitter = mitt<Events>();

	async start(user: string, input: Input): Promise<number> {
		const id = this.nextId++;

		const download: Download = {
			id,
			user,
			status: "waiting",
			process: undefined,
		};

		this.downloads.set(id, download);
		this.notify();
		// this.emitter.emit("download", download);

		await delay(CONFIG.delayMin, CONFIG.delayMax);

		const proc = spawn({
			cmd: [
				"bash",
				"-c",
				`${input.commandPrefix} -output "${input.outputPath}" -user "${user}"`,
			],
			stdout: "pipe",
			stderr: "pipe",
		});

		const stored = this.downloads.get(id);
		if (stored) {
			stored.process = proc;
			stored.status = "running";
			this.notify();
			// this.emitter.emit("download", stored);
		}

		proc.exited.then((code) => {
			const dl = this.downloads.get(id);
			if (dl && dl.status === "running") {
				dl.status = code === 0 ? "completed" : "error";
				this.notify();
				// this.emitter.emit("download", dl);
			}
		});

		// Stream in background
		if (proc.stdout) {
			const stdout = proc.stdout;
			(async () => {
				for await (const _ of stdout) {
					// silent
				}
			})();
		}

		if (proc.stderr) {
			(async () => {
				for await (const _ of proc.stderr) {
					/* intentionally empty */
				}
			})().catch(() => void 0);
		}

		// console.log(`✓ Started download for @${user} (ID: ${id})`);
		return id;
	}

	stop(id: number): boolean {
		const dl = this.downloads.get(id);
		if (!dl) return false;

		dl.process?.kill();
		dl.status = "stopped";
		this.notify();
		// this.emitter.emit("download", dl);
		return true;
	}

	getAll() {
		return Array.from(this.downloads.values());
	}

	getRunning() {
		return this.getAll().filter((d) => d.status === "running");
	}

	stopAll() {
		this.getRunning().forEach((d) => void this.stop(d.id));
	}

	notify(): void {
		this.emitter.emit("downloads", this.getAll());
	}
}
