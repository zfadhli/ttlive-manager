import { log } from "@clack/prompts";
import type { Download } from "./types.ts";
import { formatElapsed } from "./utils.ts";

export class Terminal {
	private lastRender = 0;
	private isMenuActive = false;

	setMenuActive(active: boolean): void {
		this.isMenuActive = active;
	}

	resetThrottle(): void {
		this.lastRender = 0;
	}

	renderStatus(downloads: Download[]): void {
		const now = Date.now();
		if (now - this.lastRender < 250) return;
		this.lastRender = now;

		if (this.isMenuActive) {
			this.saveCursor();
		} else {
			console.clear();
		}

		log.step("📊 Download Status:\n");
		this.renderDownloads(downloads);

		if (this.isMenuActive) {
			this.restoreCursor();
		}
	}

	private renderDownloads(downloads: Download[]): void {
		if (downloads.length === 0) {
			log.message("No downloads yet\n");
			return;
		}

		const icons: Record<string, string> = {
			waiting: "⏳",
			downloading: "🚀",
			completed: "✅",
			stopped: "🛑",
			error: "❌",
		};

		downloads.forEach((d) => {
			const icon = icons[d.status] ?? icons.error;
			const elapsed =
				d.status === "downloading" ? formatElapsed(d.startTime) : "";
			const line = [
				`   ${icon}`,
				`[${d.id}]`,
				`@${d.user.padEnd(30)}`,
				d.status.padEnd(13),
				elapsed,
			].join(" ");
			console.log(line);
		});
	}

	private saveCursor(): void {
		process.stdout.write("\x1b[s");
		process.stdout.write("\x1b[0;0H");
	}

	private restoreCursor(): void {
		process.stdout.write("\x1b[u");
	}
}
