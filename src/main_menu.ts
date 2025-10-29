import { multiselect, outro, select, text } from "@clack/prompts";
import type { DownloadManager } from "./download_manager";
import { renderStatus } from "./start_menu";
import type { Download, Input } from "./types";

export async function mainMenu(
	manager: DownloadManager,
	users: string[],
	input: Input,
	getSnapshot: () => Download[],
	consumePending: () => boolean,
): Promise<void> {
	const { commandPrefix, outputPath } = input;
	while (true) {
		// renderStatus(manager.getAll());
		// manager.notify();
		if (consumePending()) {
			renderStatus(getSnapshot());
		} else {
			renderStatus(manager.getAll());
		}

		const action = await select({
			message: "What would you like to do?",
			options: [
				{ value: "start", label: "➕ Start a new download" },
				{
					value: "stop",
					label: "⏹️ Stop a download",
				},
				{ value: "exit", label: "❌ Exit" },
			],
		});

		if (action === "start") {
			const startAction = await select({
				message: "How would you like to start?",
				options: [
					{ value: "custom", label: "✏️ Enter custom username" },
					{
						value: "list",
						label: "📋 Select from users list",
					},
				],
			});

			if (startAction === "custom") {
				const user = (await text({
					message: "Enter username to download:",
				})) as string;
				if (user?.trim()) {
					await manager.start(user.trim(), commandPrefix, outputPath, false);
				}
			} else if (startAction === "list") {
				const selected = (await multiselect({
					message: "Select user(s) to download:",
					options: users.map((u) => ({ value: u, label: u })),
					required: false,
				})) as string[];
				const isBatch = selected.length > 1;
				for (const user of selected || []) {
					await manager.start(user, commandPrefix, outputPath, isBatch);
				}
			}
		}

		if (action === "stop") {
			const running = manager.getRunning();
			if (!running.length) {
				console.log("❌ No running downloads\n");
				await new Promise((r) => setTimeout(r, 1500));
				continue;
			}

			const selected = (await multiselect({
				message: "Select download(s) to stop:",
				options: running.map((d) => ({
					value: d.id.toString(),
					label: `@${d.user}`,
				})),
				required: false,
			})) as string[];

			selected?.forEach((id) => void manager.stop(+id));
		}

		if (action === "exit") {
			const running = manager.getRunning();
			if (running.length) {
				const confirm = await select({
					message: "Running downloads exist. Exit anyway?",
					options: [
						{ value: "yes", label: "Yes, exit" },
						{ value: "no", label: "No, go back" },
					],
				});
				if (confirm === "no") continue;
				manager.stopAll();
			}
			renderStatus(manager.getAll());
			// manager.notify();
			outro("✨ Goodbye!");
			break;
		}
	}
}
