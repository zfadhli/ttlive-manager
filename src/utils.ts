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

export function delay(min: number, max: number): Promise<void> {
	const delay = Math.floor(Math.random() * (max - min + 1)) + min;
	return new Promise((resolve) => setTimeout(resolve, delay));
}
