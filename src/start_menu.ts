import { isCancel, log, multiselect, select } from "@clack/prompts";
import type { DownloadManager } from "./download_manager";
import { renderStatus } from "./render_status";
import type { Input } from "./types";

// Main flow - clear and simple
export async function startMenu(
	manager: DownloadManager,
	users: string[],
	input: Input,
): Promise<boolean> {
	if (!users.length) return true;

	log.message(`📋 Found ${users.length} user(s) in ${input.userListFile}\n`);

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
				void manager.start(user, input);
			}
			renderStatus();
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
					await manager.start(user, input);
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
