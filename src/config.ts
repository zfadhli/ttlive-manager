/* Default configuration exposed here for ergonomics */
export const CONFIG = {
    delayMin: 10_000,
    delayMax: 15_000,
    scriptDirectory: "/home/envs4/workspaces/tiktok-68/src",
    commandPrefix: "uv run main.py -no-update-check",
    outputPath: "/mnt/c/users/envs4/downloads/Tiktok/",
    userListFile: "users.txt",
} as const;
