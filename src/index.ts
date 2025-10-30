import { cancel, group, intro, outro, text } from "@clack/prompts";
import { CONFIG } from "./config";
import { DownloadManager } from "./download_manager";
import { mainMenu } from "./main_menu";
import { renderStatus } from "./render_status";
import { startMenu } from "./start_menu";
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

	renderStatus();

	const users = await loadUsers(input.userListFile);

	const manager = new DownloadManager();
	const shouldContinue = await startMenu(manager, users, input);
	if (!shouldContinue) {
		outro("✨ Goodbye!");
		return;
	}

	await mainMenu(manager, users, input);
}

main().catch(console.error);
