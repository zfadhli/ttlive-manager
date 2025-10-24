import { existsSync, readFileSync } from "node:fs";
import { intro, multiselect, outro, select, text } from "@clack/prompts";
import { spawn } from "bun";

// Config
const CONFIG = {
	delayMin: 30000,
	delayMax: 45000,
	commandPrefix: "uv run main.py -no-update-check -mode automatic",
	outputPath: "./",
	userListFile: "users.txt",
} as const;

// Types
type Status = "running" | "completed" | "stopped" | "error";

interface Download {
	id: number;
	user: string;
	status: Status;
	process?: ReturnType<typeof spawn>;
}

// State management - simple and focused
class DownloadManager {
	private downloads = new Map<number, Download>();
	private nextId = 1;

	async start(
		user: string,
		commandPrefix: string,
		outputPath: string,
	): Promise<number> {
		const id = this.nextId++;
		const delay =
			Math.random() * (CONFIG.delayMax - CONFIG.delayMin) + CONFIG.delayMin;
		const delaySec = Math.round(delay / 1000);

		console.log(`⏳ Waiting ${delaySec}s before starting @${user}...`);
		await new Promise((r) => setTimeout(r, delay));

		const proc = spawn({
			cmd: [
				"bash",
				"-c",
				`${commandPrefix} -output "${outputPath}" -user ${user}`,
			],
			stdout: "pipe",
			stderr: "pipe",
		});

		const download: Download = {
			id,
			user,
			status: "running",
			process: proc,
		};

		this.downloads.set(id, download);

		proc.exited.then((code) => {
			const dl = this.downloads.get(id);
			if (dl && dl.status === "running") {
				dl.status = code === 0 ? "completed" : "error";
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

		console.log(`✓ Started download for @${user} (ID: ${id})`);
		return id;
	}

	stop(id: number): boolean {
		const dl = this.downloads.get(id);
		if (!dl) return false;

		dl.process?.kill();
		dl.status = "stopped";
		console.log(`✓ Stopped download for @${dl.user}`);
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
}

// UI - pure rendering
function renderStatus(downloads: Download[]) {
	console.clear();
	console.log("\n📊 Download Status:\n");

	if (downloads.length === 0) {
		console.log("No downloads yet\n");
		return;
	}

	downloads.forEach(({ id, user, status }) => {
		const icon: Record<Status, string> = {
			running: "⏳",
			completed: "✅",
			stopped: "⏹️",
			error: "❌",
		};

		console.log(`${icon[status]} [${id}] @${user.padEnd(15)} ${status}`);
	});
	console.log();
}

function loadUsers(filePath: string): string[] {
	if (!existsSync(filePath)) {
		console.log(`⚠️  ${filePath} not found. Starting with empty list.\n`);
		return [];
	}

	return readFileSync(filePath, "utf-8")
		.split("\n")
		.map((u) => u.trim())
		.filter((u) => u && !u.startsWith("#"));
}

// Main flow - clear and simple
async function promptInitialUsers(
	manager: DownloadManager,
	users: string[],
	commandPrefix: string,
	outputPath: string,
	userListFile: string,
): Promise<boolean> {
	if (!users.length) return true;

	console.log(`\n📋 Found ${users.length} user(s) in ${userListFile}\n`);

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

		if (action === "all") {
			console.log(`\n🚀 Starting ${users.length} download(s)...\n`);
			for (const user of users) {
				await manager.start(user, commandPrefix, outputPath);
			}
			return true;
		} else if (action === "select") {
			const selected = (await multiselect({
				message: "Select users to download:",
				options: users.map((u) => ({ value: u, label: u })),
				required: false,
			})) as string[];

			if (selected && selected.length > 0) {
				console.log(`\n🚀 Starting ${selected.length} download(s)...\n`);
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
async function mainMenu(
	manager: DownloadManager,
	users: string[],
	commandPrefix: string,
	outputPath: string,
): Promise<void> {
	while (true) {
		renderStatus(manager.getAll());

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
					await manager.start(user.trim(), outputPath, commandPrefix);
				}
			} else if (startAction === "list") {
				const selected = (await multiselect({
					message: "Select user(s) to download:",
					options: users.map((u) => ({ value: u, label: u })),
					required: false,
				})) as string[];
				for (const user of selected || []) {
					await manager.start(user, commandPrefix, outputPath);
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
			outro("✨ Goodbye!");
			break;
		}
	}
}

async function main(): Promise<void> {
	intro("🎬 TikTok Livestream Manager");

	const commandPrefix = ((await text({
		message: "Command prefix:",
		placeholder: CONFIG.commandPrefix,
	})) || CONFIG.commandPrefix) as string;

	const outputPath = ((await text({
		message: "Output path:",
		placeholder: CONFIG.outputPath,
	})) || CONFIG.outputPath) as string;

	const userListFile = ((await text({
		message: "Users list filename:",
		placeholder: CONFIG.userListFile,
	})) || CONFIG.userListFile) as string;

	const manager = new DownloadManager();
	const users = loadUsers(userListFile);

	const shouldContinue = await promptInitialUsers(
		manager,
		users,
		commandPrefix,
		outputPath,
		userListFile,
	);
	if (!shouldContinue) {
		outro("✨ Goodbye!");
		return;
	}

	await mainMenu(manager, users, commandPrefix, outputPath);
}

main().catch(console.error);
