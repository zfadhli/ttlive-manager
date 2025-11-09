// src/cli.ts
import { intro, log, outro } from "@clack/prompts";
import { CONFIG } from "./config.ts";
import { DownloadManager } from "./manager";
import { inputText, selectAction, selectMultiple } from "./prompts";
import { Terminal } from "./terminal";
import { readFile, sleep } from "./utils.ts";

export class CLI {
	private manager: DownloadManager;
	private terminal: Terminal;
	private users: string[] = [];

	constructor() {
		this.manager = new DownloadManager({
			scriptDirectory: CONFIG.scriptDirectory,
			delayMin: CONFIG.delayMin,
			delayMax: CONFIG.delayMax,
		});
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
		return {
			commandPrefix: await inputText("Command prefix:", CONFIG.commandPrefix),
			outputPath: await inputText("Output path:", CONFIG.outputPath),
			userListFile: await inputText(
				"Users list filename:",
				CONFIG.userListFile,
			),
		};
	}

	private async promptInitialUsers(config: {
		commandPrefix: string;
		outputPath: string;
		userListFile: string;
	}): Promise<boolean> {
		if (!this.users.length) return true;

		log.info(
			`\n📋 Found ${this.users.length} user${this.users.length > 1 ? "s" : ""} in ${config.userListFile}\n`,
		);

		while (true) {
			this.terminal.setMenuActive(true);
			const action = await selectAction("What would you like to do?", [
				{ value: "all", label: "▶️ Start all" },
				{ value: "select", label: "✓ Select users" },
				{ value: "skip", label: "⏭️ Skip" },
				{ value: "exit", label: "❌ Exit" },
			]);
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

	private async mainMenu(config: {
		commandPrefix: string;
		outputPath: string;
	}): Promise<void> {
		while (true) {
			this.terminal.renderStatus(this.manager.getAll());

			this.terminal.setMenuActive(true);
			const action = await selectAction("What would you like to do?", [
				{ value: "start", label: "➕ Start a new download" },
				{ value: "stop", label: "⏹️ Stop a download" },
				{ value: "restart", label: "🔄 Restart a download" },
				{ value: "refresh", label: "🔁 Refresh" },
				{ value: "exit", label: "❌ Exit" },
			]);
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

	private async handleStart(config: {
		commandPrefix: string;
		outputPath: string;
	}): Promise<void> {
		this.terminal.setMenuActive(true);
		const mode = await selectAction("Start from...", [
			{ value: "custom", label: "✏️ Custom username" },
			{ value: "list", label: "📋 From users list" },
		]);
		this.terminal.setMenuActive(false);

		if (mode === "custom") {
			const user = await inputText("Username:", "");
			if (user) {
				await this.manager.start(user, config.outputPath, {
					commandPrefix: config.commandPrefix,
					isBatch: false,
				});
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
		const selected = (await selectMultiple(
			"Select to stop:",
			running.map((d) => `@${d.user}`),
		)) as string[];
		this.terminal.setMenuActive(false);

		selected.forEach((label) => {
			const user = label.slice(1);
			const download = running.find((d) => d.user === user);
			if (download) this.manager.stop(download.id);
		});

		this.terminal.renderStatus(this.manager.getAll());
	}

	private async handleRestart(config: {
		commandPrefix: string;
	}): Promise<void> {
		const all = this.manager.getAll();
		if (!all.length) {
			log.message("❌ No downloads to restart\n");
			await sleep(600);
			return;
		}

		this.terminal.setMenuActive(true);
		const selected = (await selectMultiple(
			"Select to restart:",
			all.map((d) => `@${d.user} (${d.status})`),
		)) as string[];
		this.terminal.setMenuActive(false);

		selected.forEach((label) => {
			const parts = label.match(/@(\w+)/);
			if (parts) {
				const user = parts[1];
				const download = all.find((d) => d.user === user);
				if (download) {
					this.manager.restart(download.id, {
						commandPrefix: config.commandPrefix,
					});
				}
			}
		});

		this.terminal.renderStatus(this.manager.getAll());
	}

	private async confirmExit(): Promise<boolean> {
		const running = this.manager.getRunning();
		if (!running.length) return true;

		this.terminal.setMenuActive(true);
		const confirm = await selectAction(
			"Running downloads exist. Exit anyway?",
			[
				{ value: "yes", label: "Yes, exit" },
				{ value: "no", label: "No, go back" },
			],
		);
		this.terminal.setMenuActive(false);

		if (confirm === "yes") {
			this.manager.stopAll();
			return true;
		}
		return false;
	}

	private async selectUsers(): Promise<string[]> {
		this.terminal.setMenuActive(true);
		const selected = await selectMultiple("Select user(s):", this.users);
		this.terminal.setMenuActive(false);
		return selected;
	}

	private async startUsers(
		users: string[],
		config: { commandPrefix: string; outputPath: string },
	): Promise<void> {
		for (const user of users) {
			await this.manager.start(user, config.outputPath, {
				commandPrefix: config.commandPrefix,
				isBatch: users.length > 1,
			});
		}
	}

	getManager(): DownloadManager {
		return this.manager;
	}
}
