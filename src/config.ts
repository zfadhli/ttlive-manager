export const CONFIG = {
	delayMin: 10_000,
	delayMax: 20_000,
	commandPrefix:
		"cd /home/envs4/workspaces/tiktok-68/src && uv run main.py -no-update-check -mode automatic",
	outputPath: "/mnt/c/users/envs4/downloads/Tiktok/",
	userListFile: "users.txt",
} as const;
