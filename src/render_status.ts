import { log } from "@clack/prompts";
import { DownloadManager } from "./download_manager";
import type { Status } from "./types";

let lastRender = 0;

export function renderStatus() {
	const now = Date.now();
	if (now - lastRender < 500) return;
	lastRender = now;

	const manager = new DownloadManager();
	const downloads = manager.getAll();

	console.clear();

	log.step("📊 Download Status:\n");

	if (downloads.length === 0) {
		log.message("No downloads yet\n");
		return;
	}

	const icon: Record<Status, string> = {
		waiting: "⏱️",
		running: "⏳",
		completed: "✅",
		stopped: "⏹️",
		error: "❌",
	};

	downloads.forEach(({ id, user, status }) => {
		log.message(`${icon[status]} [${id}] @${user.padEnd(20)} ${status}`);
	});
}
