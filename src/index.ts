import { intro, outro, text } from "@clack/prompts";
import { CONFIG } from "./config";
import { DownloadManager } from "./download_manager";
import { mainMenu } from "./main_menu";
import { startMenu } from "./start_menu";
import { loadUsers } from "./utils";

async function main(): Promise<void> {
  intro("🎬 TikTok Livestream Manager");

  const commandPrefix = (await text({
    message: "Command prefix:",
    placeholder: CONFIG.commandPrefix,
    defaultValue: CONFIG.commandPrefix,
    validate: (value) => {
      return value.trim();
    },
  })) as string;

  const outputPath = (await text({
    message: "Output path:",
    placeholder: CONFIG.outputPath,
    defaultValue: CONFIG.outputPath,
    validate: (value) => {
      return value.trim();
    },
  })) as string;

  const userListFile = (await text({
    message: "Users list filename:",
    placeholder: CONFIG.userListFile,
    defaultValue: CONFIG.userListFile,
    validate: (value) => {
      return value.trim();
    },
  })) as string;

  const manager = new DownloadManager();
  const users = loadUsers(userListFile);

  const shouldContinue = await startMenu(
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
