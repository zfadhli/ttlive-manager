import { spawn } from "bun";
import { CONFIG } from "./config";
import type { Download } from "./types";
import { delay } from "./utils";

export class DownloadManager {
  private downloads = new Map<number, Download>();
  private nextId = 1;

  async start(
    user: string,
    commandPrefix: string,
    outputPath: string,
    isBatch: boolean = false,
  ): Promise<number> {
    const id = this.nextId++;
    if (isBatch) {
      // const delay =
      //   Math.random() * (CONFIG.delayMax - CONFIG.delayMin) + CONFIG.delayMin;
      // const delaySec = Math.round(delay / 1000);

      // console.log(`⏳ Waiting ${delaySec}s before starting @${user}...`);
      // await new Promise((r) => setTimeout(r, delay));
      await delay(CONFIG.delayMin, CONFIG.delayMax);
    }

    const proc = spawn({
      cmd: [
        "bash",
        "-c",
        `${commandPrefix} -output "${outputPath}" -user "${user}"`,
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
