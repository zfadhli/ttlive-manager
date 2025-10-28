import { existsSync, readFileSync } from "node:fs";
export function loadUsers(filePath: string): string[] {
  if (!existsSync(filePath)) {
    console.log(`⚠️  ${filePath} not found. Starting with empty list.\n`);
    return [];
  }

  return readFileSync(filePath, "utf-8")
    .split("\n")
    .map((u) => u.trim())
    .filter((u) => u && !u.startsWith("#"));
}
