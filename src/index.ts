import { intro, outro, text } from "@clack/prompts";
import { CONFIG } from "./config";
import { main_menu } from "./main_menu";
import { DownloadManager } from "./manager";
import { loadUsers, start_menu } from "./start_menu";

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

  const shouldContinue = await start_menu(
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

  await main_menu(manager, users, commandPrefix, outputPath);
}

main().catch(console.error);
