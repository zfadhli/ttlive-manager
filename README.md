# TikTok Livestream Manager CLI

A Bun-based CLI tool to manage and download multiple TikTok livestreams simultaneously with random staggered starts to avoid IP bans. This CLI is built for [Michele0303/tiktok-live-recorder](https://github.com/Michele0303/tiktok-live-recorder).

## Features

✅ Download multiple TikTok livestreams at once  
✅ Start/stop any download individually anytime  
✅ Random delay between 30-45 seconds between downloads to prevent IP bans  
✅ Load users from a custom list file  
✅ Select specific users or start all at once  
✅ Real-time status monitoring  
✅ Interactive CLI with `@clack/prompts`  

## Setup

### 1. Create a users list file

Create `users.txt` (or any filename) with usernames:

```
# TikTok Livestream Users (lines starting with # are ignored)
user_aaa
user_bbb
user_ccc
```

### 2. Ensure Python script is available

Make sure `main.py` is in the current directory and can be run with:

```bash
uv run main.py -no-update-check -mode automatic -output "/path/to/output" -user username
```

## Usage

Run the CLI:

```bash
bun run index.ts
```

### Interactive Menu

**1. Configure output path:**
```
Output path: /mnt/c/users/zfadhli/downloads/
```

**2. Select users list file:**
```
Users list filename: users.txt
```

**3. Choose initial action:**
```
What would you like to do?
  ▶️  Start all
  ✓ Select specific users
  ⏭️ Skip for now
  ❌ Exit
```

**4. Main menu:**
```
📊 Download Status:

⏳ [0] @user_aaa   running
✅ [1] @user_bbb   completed
⏹️ [2] @user_ccc   stopped

What would you like to do?
  ➕ Start a new download
  ⏹️ Stop a download
  ❌ Exit
```

### Starting Downloads

**Option 1: From user list**
- Select "Start a new download" → "Select from users list"
- Multi-select users with space bar

**Option 2: Custom username**
- Select "Start a new download" → "Enter custom username"
- Type any username

### Stopping Downloads

- Select "Stop a download"
- Multi-select downloads to stop with space bar
- Press enter to confirm

## Status Indicators

| Icon | Status | Description |
|------|--------|-------------|
| ⏳ | running | Download in progress |
| ✅ | completed | Download finished successfully |
| ⏹️ | stopped | Manually stopped |
| ❌ | error | Download failed |

## How It Works

1. **Staggered Starts**: Each download has a random 30-45 second delay before starting to avoid IP bans
2. **Background Streaming**: Process output is streamed in the background without blocking the UI
3. **Non-blocking UI**: Menu remains responsive while downloads are running
4. **Process Management**: Each download runs independently and can be stopped anytime

## Configuration

Edit the `CONFIG` object in `index.ts`:

```typescript
const CONFIG = {
  delayMin: 30000,      // Min delay in ms (30 seconds)
  delayMax: 45000,      // Max delay in ms (45 seconds)
  outputPath: "/mnt/c/users/zfadhli/downloads/",
  userListFile: "users.txt",
} as const;
```

## Troubleshooting

### "users.txt not found"
- Create the file in the same directory as `index.ts`
- Or specify a different filename when prompted

### "Python script not found"
- Ensure `main.py` is in the current directory
- Or adjust the command path in `DownloadManager.start()`

### Downloads fail with "error" status
- Check Python script logs for details
- Verify TikTok username is correct
- Check network connection

### Ctrl+C doesn't work in initial menu
- Use the "Exit" option instead
- Or select "Skip for now" then "Exit" in main menu

## Example Workflow

```bash
$ bun run index.ts

📋 Found 3 user(s) in users.txt:

  1. user_aaa
  2. user_bbb
  3. user_ccc

What would you like to do?
✓ Start all

🚀 Starting 3 download(s)...

⏳ Waiting 42s before starting @user_aaa...
⏳ Waiting 35s before starting @user_bbb...
⏳ Waiting 38s before starting @user_ccc...

✓ Started download for @user_aaa (ID: 0)
✓ Started download for @user_bbb (ID: 1)
✓ Started download for @user_ccc (ID: 2)

📊 Download Status:

⏳ [0] @user_aaa   running
⏳ [1] @user_bbb   running
⏳ [2] @user_ccc   running
```

## License

MIT