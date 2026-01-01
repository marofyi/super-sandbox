# Live Preview for CC Web

Live preview HTML projects from CC Web sandbox using encrypted GitHub Gists.

## Quick Start

### 1. Create a Gist
```bash
gh gist create --public preview.txt
# Note the Gist ID from the URL
export GIST_ID="your-gist-id"
```

### 2. Push Encrypted Content
```bash
./update-preview-encrypted.sh your-file.html "your-password"
```

### 3. Generate Viewer URL
```bash
./make-data-url.sh viewer-v6.html
```

### 4. Open Viewer
Paste the data: URL in browser, enter Gist ID and password.

## Files

| File | Purpose |
|------|---------|
| `viewer-v6.html` | Encrypted preview viewer (uses forge library) |
| `viewer-v6-data-url.txt` | Pre-generated data URL for viewer |
| `update-preview-encrypted.sh` | Encrypt and push HTML to Gist |
| `make-data-url.sh` | Generate data: URL from HTML file |

## How It Works

```
CC Web                          Browser
  │                                │
  ├─ encrypt HTML ──────────────►  │
  ├─ push to public Gist           │
  │                                │
  │         ◄── poll GitHub API ───┤
  │         ◄── decrypt with pwd ──┤
  │         ◄── render in iframe ──┤
```

- **Encryption:** AES-256-GCM with PBKDF2 (100k iterations)
- **Polling:** 3-second interval via GitHub API
- **Viewer:** Self-contained HTML, works from data: URL

## Limitations

- **Rate limit:** 60 requests/hour unauthenticated (~20 min continuous polling)
- **Latency:** ~3 seconds for updates to appear

## See Also

- [CHANGELOG.md](./CHANGELOG.md) - Historical learnings and what didn't work
