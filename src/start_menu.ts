import { isCancel, log, multiselect, select } from "@clack/prompts";
import type { DownloadManager } from "./download_manager";
import type { Download, Input, Status } from "./types";

export function renderStatus(downloads: Download[]) {
	console.clear();
	log.step("📊 Download Status:\n");

	if (downloads.length === 0) {
		log.message("No downloads yet\n");
		return;
	}

	downloads.forEach(({ id, user, status }) => {
		const icon: Record<Status, string> = {
			waiting: "⏱️",
			running: "⏳",
			completed: "✅",
			stopped: "⏹️",
			error: "❌",
		};

		log.message(`${icon[status]} [${id}] @${user.padEnd(20)} ${status}`);
	});
}

// Main flow - clear and simple
export async function startMenu(
	manager: DownloadManager,
	users: string[],
	input: Input,
): Promise<boolean> {
	if (!users.length) return true;
	const { commandPrefix, outputPath, userListFile } = input;

	log.message(`📋 Found ${users.length} user(s) in ${userListFile}\n`);

	while (true) {
		const action = await select({
			message: "What would you like to do?",
			options: [
				{ value: "all", label: "▶️  Start all" },
				{ value: "select", label: "✓ Select specific users" },
				{ value: "skip", label: "⏭️ Skip for now" },
				{ value: "exit", label: "❌ Exit" },
			],
		});

		if (isCancel(action)) {
			return process.exit(0);
		}

		if (action === "all") {
			// log.message(`🚀 Starting ${users.length} download(s)...\n`);
			for (const user of users) {
				void manager.start(user, commandPrefix, outputPath);
			}
			renderStatus(manager.getAll());
			return true;
		} else if (action === "select") {
			const selected = (await multiselect({
				message: "Select users to download:",
				options: users.map((u) => ({ value: u, label: u })),
				required: false,
			})) as string[];

			if (selected && selected.length > 0) {
				log.message(`🚀 Starting ${selected.length} download(s)...\n`);
				for (const user of selected) {
					await manager.start(user, commandPrefix, outputPath);
				}
				return true;
			}
		} else if (action === "skip") {
			return true;
		} else if (action === "exit") {
			return false;
		}
	}
}
