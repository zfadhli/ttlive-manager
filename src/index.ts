import { cancel, group, intro, outro, text } from "@clack/prompts";
import { CONFIG } from "./config";
import { DownloadManager } from "./download_manager";
import { mainMenu } from "./main_menu";
import { renderStatus, startMenu } from "./start_menu";
import type { Download } from "./types";
import { loadUsers } from "./utils";

async function main(): Promise<void> {
	intro("🎬 TikTok Livestream Manager");

	const input = await group(
		{
			commandPrefix: () =>
				text({
					message: "Command prefix:",
					placeholder: CONFIG.commandPrefix,
					defaultValue: CONFIG.commandPrefix,
				}),
			outputPath: () =>
				text({
					message: "Output path:",
					placeholder: CONFIG.outputPath,
					defaultValue: CONFIG.outputPath,
				}),
			userListFile: () =>
				text({
					message: "Users list filename:",
					placeholder: CONFIG.userListFile,
					defaultValue: CONFIG.userListFile,
				}),
		},
		{
			onCancel: () => {
				cancel("Operation cancelled.");
				process.exit(0);
			},
		},
	);

	const manager = new DownloadManager();
	let latestDownloads: Download[] = manager.getAll();
	let pendingUiUpdate = false;

	manager.emitter.on("downloads", (list: Download[]) => {
		latestDownloads = list;
		pendingUiUpdate = true;
		// renderStatus(list);
	});
	renderStatus(latestDownloads);

	const users = loadUsers(input.userListFile);

	const shouldContinue = await startMenu(manager, users, input);
	if (!shouldContinue) {
		outro("✨ Goodbye!");
		return;
	}

	await mainMenu(
		manager,
		users,
		input,
		() => latestDownloads,
		() => {
			const pending = pendingUiUpdate;
			pendingUiUpdate = false;
			return pending;
		},
	);
}

main().catch(console.error);
