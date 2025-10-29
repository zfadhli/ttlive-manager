import { intro, isCancel, outro, text } from "@clack/prompts";
import { CONFIG } from "./config";
import { DownloadManager } from "./download_manager";
import { mainMenu } from "./main_menu";
import { renderStatus, startMenu } from "./start_menu";
import type { Download } from "./types";
import { loadUsers } from "./utils";

async function main(): Promise<void> {
  intro("🎬 TikTok Livestream Manager");

  const commandPrefix = (await text({
    message: "Command prefix:",
    placeholder: CONFIG.commandPrefix,
    defaultValue: CONFIG.commandPrefix,
  })) as string;

  if (isCancel(commandPrefix)) {
    return process.exit(0);
  }

  const outputPath = (await text({
    message: "Output path:",
    placeholder: CONFIG.outputPath,
    defaultValue: CONFIG.outputPath,
  })) as string;

  if (isCancel(outputPath)) {
    return process.exit(0);
  }

  const userListFile = (await text({
    message: "Users list filename:",
    placeholder: CONFIG.userListFile,
    defaultValue: CONFIG.userListFile,
  })) as string;

  if (isCancel(userListFile)) {
    return process.exit(0);
  }

  const manager = new DownloadManager();
  let latestDownloads: Download[] = manager.getAll();
  let pendingUiUpdate = false;

  manager.emitter.on("downloads", (list: Download[]) => {
    latestDownloads = list;
    pendingUiUpdate = true;
    // renderStatus(list);
  });
  renderStatus(latestDownloads);

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

  await mainMenu(
    manager,
    users,
    commandPrefix,
    outputPath,
    () => latestDownloads,
    () => {
      const pending = pendingUiUpdate;
      pendingUiUpdate = false;
      return pending;
    },
  );
}

main().catch(console.error);
