import { multiselect, select } from "@clack/prompts";
import type { DownloadManager } from "./manager";
import type { Download, Status } from "./types";

export function renderStatus(downloads: Download[]) {
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

    console.log(`${icon[status]} [${id}] @${user.padEnd(20)} ${status}`);
  });
  console.log();
}

// Main flow - clear and simple
export async function start_menu(
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
        await manager.start(user, commandPrefix, outputPath, true);
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
        const isBatch = selected.length > 1;
        for (const user of selected) {
          await manager.start(user, commandPrefix, outputPath, isBatch);
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
