# Changelog

Historical learnings from the live preview exploration.

## Key Discovery: Live Preview from CC Web Sandbox

**Problem:** CC Web runs in an isolated sandbox with no incoming network connections. Traditional dev servers (localhost) and tunnels (ngrok, localtunnel) don't work.

**Solution:** GitHub Gist as relay + polling viewer

## What Didn't Work

### Tunnel Services
- **localtunnel**: Connections drop immediately (sandbox blocks persistent connections)
- **ngrok**: Exits without output (same sandbox restrictions)

### Third-Party Services
- **CodePen POST API**: 403 Forbidden (Cloudflare blocks CC Web IPs)
- **surge.sh**: Requires authentication

### Browser Extension
- Eliminated early: doesn't work on mobile

### Raw GitHub URLs
- `raw.githubusercontent.com` has aggressive CDN caching
- Content flip-flops between versions on different edge servers
- **Fix:** Use GitHub API instead (`api.github.com/gists/{id}`)

### Web Crypto API in data: URLs
- `crypto.subtle` requires secure context (HTTPS)
- data: URLs are NOT secure contexts
- **Fix:** Use forge library from CDN instead

### itty.bitty URLs
- LZMA compression works but rendering was unreliable
- Switched to data: URLs for viewer distribution

## What Worked

### Architecture
```
CC Web → encrypt → push to Gist → GitHub API ← poll ← Viewer (data: URL)
```

### Key Components
1. **Encryption (CC Web side):** Node.js crypto - AES-256-GCM, PBKDF2 key derivation
2. **Storage:** Public GitHub Gist (content is encrypted)
3. **Viewer:** Self-contained HTML using forge library for decryption
4. **Distribution:** data: URL (base64-encoded HTML)

### Rate Limiting
- Unauthenticated GitHub API: 60 requests/hour
- 3-second polling = ~20 minutes of continuous use
- Future options: ETag conditional requests, adaptive polling, or alternative backend

## Security Considerations

### Evaluated: Embedding GitHub Token in Viewer
- **Rejected for sharing:** Token leak exposes all gists + more
- Encryption approach is safer: wrong password = nothing

### Current Approach
- Public gist contains only ciphertext
- Password shared separately
- No API credentials exposed in viewer
