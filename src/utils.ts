export async function loadUsers(filePath: string): Promise<string[]> {
	try {
		const content = await Bun.file(filePath).text();
		return content
			.split("\n")
			.map((u) => u.trim())
			.filter((u) => u && !u.startsWith("#"));
	} catch {
		// Bun.file(...).text() throws when the file doesn't exist - match
		// previous behavior by returning an empty list and logging a warning.
		console.log(`⚠️  ${filePath} not found. Starting with empty list.\n`);
		return [];
	}
}

export function delay(min: number, max: number): Promise<void> {
	const delay = Math.floor(Math.random() * (max - min + 1)) + min;
	return new Promise((resolve) => setTimeout(resolve, delay));
}
