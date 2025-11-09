import {
	cancel,
	group,
	intro,
	log,
	multiselect,
	outro,
	select,
	text,
} from "@clack/prompts";
import { CONFIG } from "./config.ts";
import { DownloadManager } from "./manager";
import { Terminal } from "./terminal";
import type { Config } from "./types.ts";
import { readFile, sleep } from "./utils.ts";

export class CLI {
	private manager: DownloadManager;
	private terminal: Terminal;
	private users: string[] = [];

	constructor() {
		this.manager = new DownloadManager();
		this.terminal = new Terminal();

		this.manager.on("statusChange", () => {
			this.terminal.renderStatus(this.manager.getAll());
		});
	}

	async start(): Promise<void> {
		intro("🎬 TikTok Livestream Manager");

		const config = await this.promptConfig();
		this.users = readFile(config.userListFile);

		const continueFlow = await this.promptInitialUsers(config);
		if (!continueFlow) {
			outro("✨ Goodbye!");
			return;
		}

		await this.mainMenu(config);
		outro("✨ Goodbye!");
	}

	private async promptConfig(): Promise<{
		commandPrefix: string;
		outputPath: string;
		userListFile: string;
	}> {
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

		return {
			commandPrefix: input.commandPrefix,
			outputPath: input.outputPath,
			userListFile: input.userListFile,
		};
	}

	private async promptInitialUsers(config: Config): Promise<boolean> {
		if (!this.users.length) return true;

		log.info(
			`\n📋 Found ${this.users.length} user${this.users.length > 1 ? "s" : ""} in ${config.userListFile}\n`,
		);

		while (true) {
			this.terminal.setMenuActive(true);
			const action = await select({
				message: "What would you like to do?",
				options: [
					{ value: "all", label: "▶️  Start all" },
					{ value: "select", label: "✓ Select users" },
					{ value: "skip", label: "⏭️ Skip" },
					{ value: "exit", label: "❌ Exit" },
				],
			});
			this.terminal.setMenuActive(false);

			if (action === "exit") return false;
			if (action === "skip") return true;
			if (action === "all") {
				await this.startUsers(this.users, config);
				return true;
			}
			if (action === "select") {
				const selected = await this.selectUsers();
				if (selected.length > 0) {
					await this.startUsers(selected, config);
					return true;
				}
			}
		}
	}

	private async mainMenu(config: Config): Promise<void> {
		while (true) {
			this.terminal.renderStatus(this.manager.getAll());

			this.terminal.setMenuActive(true);
			const action = await select({
				message: "What would you like to do?",
				options: [
					{ value: "start", label: "➕ Start a new download" },
					{ value: "stop", label: "⏹️ Stop a download" },
					{ value: "restart", label: "🔄 Restart a download" },
					{ value: "refresh", label: "🔁 Refresh screen" },
					{ value: "exit", label: "❌ Exit" },
				],
			});
			this.terminal.setMenuActive(false);

			switch (action) {
				case "start":
					await this.handleStart(config);
					break;
				case "stop":
					await this.handleStop();
					break;
				case "restart":
					await this.handleRestart(config);
					break;
				case "refresh":
					this.terminal.renderStatus(this.manager.getAll());
					break;
				case "exit":
					if (await this.confirmExit()) return;
					break;
			}
		}
	}

	private async handleStart(config: Config): Promise<void> {
		this.terminal.setMenuActive(true);
		const mode = await select({
			message: "How would you like to start?",
			options: [
				{ value: "custom", label: "✏️ Enter username" },
				{ value: "list", label: "📋 Select from users list" },
			],
		});
		this.terminal.setMenuActive(false);

		if (mode === "custom") {
			const user = (await text({
				message: "Username:",
			})) as string;
			if (user) {
				await this.manager.start(user, config);
			}
		} else if (this.users.length) {
			const selected = await this.selectUsers();
			await this.startUsers(selected, config);
		} else {
			log.message("❌ No users loaded from file\n");
			await sleep(600);
		}

		this.terminal.renderStatus(this.manager.getAll());
	}

	private async handleStop(): Promise<void> {
		const running = this.manager.getRunning();
		if (!running.length) {
			log.message("❌ No running downloads\n");
			await sleep(600);
			return;
		}

		this.terminal.setMenuActive(true);
		const selected = (await multiselect({
			message: "Select download(s) to stop:",
			options: running.map((d) => ({
				value: d.id.toString(),
				label: `@${d.user}`,
			})),
			required: false,
		})) as string[];
		this.terminal.setMenuActive(false);

		for (const id of selected) {
			await this.manager.stop(id);
		}

		this.terminal.renderStatus(this.manager.getAll());
	}

	private async handleRestart(config: Config): Promise<void> {
		const all = this.manager.getAll();
		if (!all.length) {
			log.message("❌ No downloads to restart\n");
			await sleep(600);
			return;
		}

		this.terminal.setMenuActive(true);
		const selected = (await multiselect({
			message: "Select download(s) to restart:",
			options: all.map((d) => ({
				value: d.id.toString(),
				label: `@${d.user}`,
			})),
			required: false,
		})) as string[];
		this.terminal.setMenuActive(false);

		for (const id of selected) {
			await this.manager.restart(id, config);
		}

		this.terminal.renderStatus(this.manager.getAll());
	}

	private async confirmExit(): Promise<boolean> {
		const running = this.manager.getRunning();
		if (!running.length) return true;

		this.terminal.setMenuActive(true);
		const confirm = await select({
			message: "Running downloads exist. Exit anyway?",
			options: [
				{ value: "yes", label: "Yes, exit" },
				{ value: "no", label: "No, go back" },
			],
		});
		this.terminal.setMenuActive(false);

		if (confirm === "yes") {
			this.manager.stopAll();
			return true;
		}
		return false;
	}

	private async selectUsers(): Promise<string[]> {
		this.terminal.setMenuActive(true);
		const selected = (await multiselect({
			message: "Select users(s):",
			options: this.users.map((user) => ({ value: user, label: user })),
			required: false,
		})) as string[];
		this.terminal.setMenuActive(false);
		return selected;
	}

	private async startUsers(users: string[], config: Config): Promise<void> {
		for (const user of users) {
			await this.manager.start(user, config);
		}
	}

	getManager(): DownloadManager {
		return this.manager;
	}
}
