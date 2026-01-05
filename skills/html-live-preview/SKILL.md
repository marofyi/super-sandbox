---
name: html-live-preview
description: Push live HTML previews from CC Web sandbox to a browser. Auto-polls GitHub Gist for updates. Use when user is creating or editing a single-file HTML page and wants to see it live.
compatibility: Requires gh CLI with gist scope, node, curl
metadata:
  author: research
  version: "1.0"
---

# HTML Live Preview

Enable live preview of single-file HTML projects from CC Web sandbox.

## Requirements

- **gh CLI** authenticated with `gist` scope (see [docs/cc-web.md](../../docs/cc-web.md#creating-the-token))
- **node** (for encryption)
- **curl** (for uploading viewer)

## How It Works

```
CC Web                              Browser
  │                                    │
  ├─ encrypt HTML with key             │
  ├─ push to GitHub Gist               │
  │                                    │
  │         ◄── poll Gist via API ─────┤
  │         ◄── decrypt with key ──────┤
  │         ◄── render in iframe ──────┤
```

## Activation

Use this skill when:
- User is creating a single-file HTML page/app
- User wants to see live preview of changes
- User says "preview", "show in browser", or similar

## Workflow

### Step 1: Check for Existing Setup

```bash
if [ -f "html-live-preview.json" ]; then
  # Setup exists, proceed to push
else
  # Run first-time setup
fi
```

### Step 2: First-Time Setup (if needed)

Run the setup script:

```bash
./skills/html-live-preview/scripts/setup.sh
```

This will:
1. Generate a random obfuscation key
2. Create a GitHub Gist (`html-live-preview.txt`)
3. Generate viewer HTML with embedded gist ID and key
4. Upload viewer to 0x0.st for a short URL
5. Save config to `html-live-preview.json`

After setup, return the viewer URL to the user in a code block:

```
https://0x0.st/xxx.html
```

Tell the user: "Open this URL in your browser. It will auto-refresh when you make changes."

### Step 3: Push Content

Run the push script with the HTML file:

```bash
./skills/html-live-preview/scripts/push.sh path/to/file.html
```

This encrypts the content and pushes to the gist. The viewer auto-polls every 5 seconds.

### Step 4: Subsequent Updates

Just run push.sh again after each change. No need to return the URL again unless user asks.

## State File: html-live-preview.json

```json
{
  "gist_id": "abc123def456",
  "key": "random-obfuscation-key",
  "viewer_url": "https://0x0.st/xxx.html"
}
```

## Rate Limits

- GitHub API: 60 requests/hour unauthenticated
- Polling interval: 5 seconds = ~12 req/min = 720/hour (exceeds limit)
- Viewer handles rate limiting gracefully (shows error, retries)

Advise users: For extended sessions, close the preview tab when not actively viewing.

## Troubleshooting

**Gist not found (404):**
- Gist may have been deleted
- Delete `html-live-preview.json` and re-run setup

**Decryption failed:**
- Key mismatch between json and viewer
- Re-run setup to regenerate everything

**0x0.st upload failed:**
- Service may be temporarily down
- Retry, or manually host the viewer HTML

## Files

| File | Purpose |
|------|---------|
| `scripts/setup.sh` | First-time setup: create gist, upload viewer |
| `scripts/push.sh` | Encrypt and push HTML content |
| `assets/viewer-template.html` | Viewer template with placeholders |
