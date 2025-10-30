import { log } from "@clack/prompts";

export async function loadUsers(filePath: string): Promise<string[]> {
	try {
		const content = await Bun.file(filePath).text();
		return content
			.split("\n")
			.map((u) => u.trim())
			.filter((u) => u && !u.startsWith("#"));
	} catch {
		log.warning(`⚠️  ${filePath} not found. Starting with empty list.\n`);
		return [];
	}
}

export function delay(min: number, max: number): Promise<void> {
	const delay = Math.floor(Math.random() * (max - min + 1)) + min;
	return new Promise((resolve) => setTimeout(resolve, delay));
}
