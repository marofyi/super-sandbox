# CC Web Live Preview System

A zero-auth, mobile-first solution for live previewing HTML projects from Claude Code Web (CC Web) sandbox environments.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Setup Guide](#setup-guide)
5. [Technical Deep Dive](#technical-deep-dive)
6. [Encrypted Mode](#encrypted-mode)
7. [Limitations](#limitations)
8. [Alternative Approaches Tested](#alternative-approaches-tested)

---

## Overview

CC Web runs in an isolated cloud sandbox with no incoming network connections. Traditional development workflows (`localhost:3000`) don't work because your browser can't reach the sandbox. This system solves that by using GitHub Gist as a relay:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   CC Web    │────────▶│ GitHub Gist │◀────────│   Viewer    │
│  (sandbox)  │  push   │   (relay)   │   poll  │  (browser)  │
└─────────────┘         └─────────────┘         └─────────────┘
```

**Key properties:**
- **Zero auth for viewer**: No login required to view previews
- **Mobile-first**: Works on phones, tablets, any browser
- **~3 second latency**: From file save to preview update
- **Private repo compatible**: Works with private GitHub repositories
- **No infrastructure**: Uses only GitHub (which CC Web already has access to)

---

## Architecture

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `update-preview-v2.sh` | Pushes HTML content to Gist | CC Web |
| `viewer-v4.html` | Polls Gist API, renders in iframe | User's browser |
| GitHub Gist | Content relay/storage | GitHub infrastructure |
| GitHub API | Cache-free content retrieval | `api.github.com` |

### Data Flow

```
1. Developer edits index.html in CC Web
                    │
                    ▼
2. Run: ./update-preview-v2.sh index.html
                    │
                    ▼
3. Script copies HTML to Gist via `gh gist edit`
                    │
                    ▼
4. Viewer polls GitHub API every 3 seconds
                    │
                    ▼
5. API returns Gist content with revision hash
                    │
                    ▼
6. If content changed, update iframe.srcdoc
                    │
                    ▼
7. Browser renders new preview instantly
```

---

## How It Works

### The Problem with Raw GitHub URLs

Initially, we tried polling raw Gist URLs:
```
https://gist.githubusercontent.com/USER/GIST_ID/raw/filename.txt
```

**Issue**: GitHub serves raw files through Fastly CDN. When you update a Gist:
- Different edge servers cache different versions
- Query params (`?t=timestamp`) don't bust CDN cache
- Result: Content flip-flops between old and new versions

### The Solution: GitHub API

The GitHub API (`api.github.com`) returns fresh data directly from GitHub's database, bypassing CDN:

```javascript
const response = await fetch('https://api.github.com/gists/' + gistId, {
  headers: { 'Accept': 'application/vnd.github.v3+json' },
  cache: 'no-store'
});
const data = await response.json();
const html = data.files[Object.keys(data.files)[0]].content;
```

**Benefits:**
- Always returns latest content
- Includes revision hash for verification (`data.history[0].version`)
- No authentication required for public Gists
- Rate limit: 60 requests/hour (unauthenticated) - sufficient for 3s polling

### Rendering via srcdoc

Instead of navigating the iframe to a URL, we inject HTML directly:

```javascript
document.getElementById('iframe').srcdoc = htmlContent;
```

**Why srcdoc over src:**
- No network request needed
- No CORS issues
- No X-Frame-Options restrictions
- Instant rendering
- Works with any HTML content

### The Viewer Distribution Problem

The viewer itself needs to be accessible from the user's browser. Solutions:

1. **itty.bitty encoding**: Entire viewer HTML compressed into URL
2. **GitHub Pages**: Host viewer in a public repo
3. **Any static host**: Netlify, Vercel, etc.

We use itty.bitty because it requires zero infrastructure:

```bash
# How itty.bitty URLs are generated
cat viewer.html | lzma -9 | base64 -w0
# Prepend: https://itty.bitty.site/#/
```

**itty.bitty technical details:**
- Uses LZMA compression (Lempel-Ziv-Markov chain algorithm)
- Content stored in URL fragment (`#/...`)
- Fragment never sent to server → no length limit from HTTP
- Browser limits: Firefox 64K+, Chrome 32K, Android 8K, Edge 2K

---

## Setup Guide

### Prerequisites

- CC Web session with GitHub token (`gh auth status` shows logged in)
- A GitHub Gist to store preview content

### Step 1: Create a Gist

```bash
# Create a new public Gist
echo "placeholder" > /tmp/preview.txt
gh gist create --public -d "Live Preview" /tmp/preview.txt

# Note the Gist ID from the output URL
# Example: https://gist.github.com/username/abc123def456
#          Gist ID = abc123def456
```

### Step 2: Configure the Update Script

Create `update-preview.sh`:

```bash
#!/bin/bash
GIST_ID="YOUR_GIST_ID_HERE"  # ← Replace with your Gist ID
HTML_FILE="${1:-index.html}"

if [ ! -f "$HTML_FILE" ]; then
    echo "Error: File not found: $HTML_FILE"
    exit 1
fi

cp "$HTML_FILE" /tmp/preview-url.txt
gh gist edit "$GIST_ID" /tmp/preview-url.txt
echo "Preview updated!"
```

```bash
chmod +x update-preview.sh
```

### Step 3: Open the Viewer

Open this URL in your browser (or phone):

```
https://itty.bitty.site/#/XQAAAAT//////////wAeCEUG0O+oKBdZ2an16qclPsVsVN2ud3BwM/ScQVFw+mKImRqk8FTfBQp6hIEh2zzW00g8U87EvOVFda2DgCvev1bDjV6fGvIGZOcPT93s8yPaBCQCSlO+coQPTlqGQL3zHmX0oRCkHIzljckSYF08+vIPxWvfDYoyH29Tx9RvS3UIbeEcsK+7MsCrlCRt6EZaNdfodTeOYPeA3eeKHSncOd1SvnG8nd7WSRI5r/obsnmuZZ+LYcGhtm+jB8rz/CGFzyjbbH/WehUYuz7/jrJyJBsU2sYvqsdsp+o0wTQMEo188MC6wPIkmgFj1dcoh/PUgGcfodyvIzRm5MWPFVOwsaHbOySS6EYjt1+241leF3nsdiR4g9GMf7v3xjmwQsnfZrkjfUia2RAxujrj0eirci5/8tuR8+Ev6EU4mpTIW3lhI89dXWAiDUOqzo+Y38ARFrJH6QYOerDzRGpxosDw/Wz5+0CWJqA38WuJ+vNN+CVg0QmQU3HLlqQzAxpxW2v9bn/kA3+R4Z42T8qirqmRkJr4AxQzPMG9yKs6LoK5H8H6WU/X4xP4YBA0o6u1mZ2RJonD5fE0woQc4y/DxGjaeRrCj2V1wX24gDMSSCA3+FdEe78egnpGo98740oJY7oHuyKCwpJ8+Dx1dkh5lPZHWkWBg5YS0MaG9XT2i9FsQVW3j+JHDxD61kbYIgJXdEjW9sIfedMMzy9twioxEeHH00xphJtY/AgjM0GECplrg0YaZlFWirZOA/W0vAX215tnmqPlZjhxZFtiDlc1O6RB/KcYYQ0kx2u/vxmT87pJH1PtWl72LZ9I00wcYPUXw8/NcEGsxG1tVX0bc2BuuXeTQKlnJsgDuyOEPYRkMhskWqJ4NpXMPZtRsGJqSXG9afsUhUxXd6QC6yGJaS1FGVVj3miULJz8Z0yYYxk0YsydGeLBUuLlwx/4d+cwckZjbwb9fqICDHPQ8qF6Dyghq9EWokqDm7ZIgSLO0Gz+Vy2CcIlfRBJh87ORULkf5vjcNMD1lXXoJo8SdXIfGSHQARiUEIzV9re+7umqtxmclh3GJkiJsN/LXeFQ98UaEe5ZG92FRZCunyg33fH7ozDsxy8Xn/WFMevkSxkHOu2QkAkn2ea3OV8p6kSGwtQEG5aIzwoxVR60nwkD+EL41YbyrKH2+80A9MqPHkQJtPuO/NWSQP9RL1nebACyH8f3ywT0kjqUC71NLBOYWXKE1W9LYIuKBh7/TwSDb0OaZIZtiL/nhkyxETD9bqQroGZvQqRt7D2ugk88cEMW1DQd7XzpBEW1f/dYkZ7rih69ook/TegFpId6oKjzRKKr+iFtXV6w0UhpEaIUUdSYBg3vmdEsqS9CA8Hb1QG12S7YMySE0ll7cTDWzCR9fb0b0nAO6KZYcGvUgTVyHDnR7WqWZxTLG+hY29ViDfUNr5yU0YGAVn1ne7wQWWJ7K7DFryXqyy8GXZBxRSICrzHoraJUpugkpDIXA71BaPCeQxNY79MDmgXkkXiMqYsmDVaUY8tVPenZFT+vJYtTwLrzz9XjFgEa0nn7uGEApyqodOgEyE9pZYUOOxTI6l9wjGalZbOKS7LGP8fyeElToBdHfYikz9KwwtTRO9X+MgPA7ZhubeGAo36UeVDU9H1m/xXWUuk9S6fbCBuaUI7PkcbWhs/Ly+sfimin1doU7dRIYR/CA382r/lmEzWiae7rbWWN6cAtET55t8AcxnevFocXKFbjSA57PisGSvPNsMBgIShrKrWoSf/akiFG
```

Enter your Gist ID and click **Start**.

### Step 4: Push Updates

```bash
# Edit your HTML file
vim index.html

# Push to preview
./update-preview.sh index.html
```

The viewer updates automatically within 3 seconds.

---

## Technical Deep Dive

### Why GitHub Gist?

| Requirement | Gist Solution |
|-------------|---------------|
| CC Web can write | ✅ `gh` CLI with existing token |
| Browser can read | ✅ Public API, no auth needed |
| No infrastructure | ✅ GitHub hosts everything |
| Fast updates | ✅ API reflects changes instantly |
| Private repo support | ✅ Gist can be separate from repo |

### API Response Structure

```javascript
// GET https://api.github.com/gists/{gist_id}
{
  "id": "abc123",
  "files": {
    "preview-url.txt": {
      "filename": "preview-url.txt",
      "content": "<!DOCTYPE html>...",  // ← Your HTML here
      "size": 1024
    }
  },
  "history": [
    {
      "version": "abc123def456...",  // ← Revision SHA
      "committed_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Viewer Core Logic

```javascript
let lastContent = '';

async function poll() {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    cache: 'no-store'  // Bypass browser cache
  });
  const data = await res.json();

  // Get first file's content
  const files = data.files;
  const html = files[Object.keys(files)[0]].content;

  // Only update if content changed
  if (html !== lastContent) {
    lastContent = html;
    document.getElementById('frame').srcdoc = html;
  }
}

setInterval(poll, 3000);
```

### LZMA Compression Details

The viewer is distributed as an itty.bitty URL using LZMA compression:

```bash
# Compression command (Linux)
cat viewer.html | lzma -9 | base64 -w0

# Decompression (in browser, via itty.bitty's JS)
base64decode(fragment) → LZMA.decompress() → HTML string
```

**Compression ratios observed:**
| Content | Raw Size | Compressed | Ratio |
|---------|----------|------------|-------|
| viewer-v4.html | ~2.5KB | 1792 chars | ~72% |
| Simple HTML page | ~1KB | ~400 chars | ~40% |

### Security Considerations

1. **Gist visibility**: Public Gists are readable by anyone with the URL
2. **Content injection**: The iframe uses `sandbox="allow-scripts"` to limit capabilities
3. **API rate limits**: 60 req/hour unauthenticated; add token for 5000 req/hour
4. **No secrets**: Never put API keys or credentials in previewed content

---

## Encrypted Mode

For private content, use encrypted mode. Content is encrypted before upload and decrypted in the browser - the Gist only ever contains ciphertext.

### Why Encryption?

| Problem | Solution |
|---------|----------|
| Public Gists expose content | Encrypt before upload |
| Can't use private Gists (need auth) | Public Gist + encryption = private content |
| Can't embed user's token in viewer | No token needed - just password |

### Encryption Architecture

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   CC Web    │                    │ GitHub Gist │                    │   Viewer    │
│             │                    │             │                    │             │
│ plaintext   │──► encrypt(pwd) ──►│ ciphertext  │◄── fetch ◄────────│ prompt pwd  │
│ HTML        │                    │ (public but │                    │ decrypt     │
│             │                    │  unreadable)│                    │ render      │
└─────────────┘                    └─────────────┘                    └─────────────┘
```

### Cryptographic Details

**Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key derivation**: PBKDF2 with SHA-256, 100,000 iterations
- **Salt**: 16 random bytes (per encryption)
- **IV**: 12 random bytes (per encryption)
- **Auth tag**: 16 bytes (integrity verification)

**Data format** (base64 encoded):
```
┌──────────┬────────┬──────────┬────────────┐
│  salt    │   IV   │ auth tag │ ciphertext │
│ 16 bytes │ 12 b   │  16 b    │  variable  │
└──────────┴────────┴──────────┴────────────┘
```

### CC Web Encryption (Node.js)

```javascript
const crypto = require('crypto');

function encrypt(plaintext, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // Derive key: PBKDF2, 100k iterations, SHA-256
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

  // Encrypt with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + authTag + ciphertext
  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
}
```

### Browser Decryption (Web Crypto API)

```javascript
async function decrypt(encryptedBase64, password) {
  const data = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  // Parse components
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const authTag = data.slice(28, 44);
  const ciphertext = data.slice(44);

  // Derive key using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Web Crypto expects authTag appended to ciphertext
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, combined
  );
  return new TextDecoder().decode(decrypted);
}
```

### Security Properties

| Property | Guarantee |
|----------|-----------|
| Confidentiality | AES-256 encryption - content unreadable without password |
| Integrity | GCM auth tag - tampering is detected |
| Freshness | Random salt/IV per encryption - no pattern analysis |
| No token exposure | Password never leaves browser, never stored |

### Usage

**CC Web side:**
```bash
./update-preview-encrypted.sh index.html "your-password"
```

**Viewer side:**
1. Open the v5 viewer URL
2. Enter Gist ID
3. Enter password
4. Content decrypts and renders

### Password Strength

Since PBKDF2 uses 100,000 iterations, even moderate passwords provide good security:

| Password | Entropy | Brute-force time (100k/sec) |
|----------|---------|----------------------------|
| 8 char alphanumeric | ~48 bits | ~89 years |
| 12 char alphanumeric | ~72 bits | ~150M years |
| Passphrase (4 words) | ~44 bits | ~5 years |

**Recommendation**: Use a 12+ character password or 4+ word passphrase.

---

## Limitations

### Content Size

- **GitHub API**: No hard limit, but large responses are slower
- **Practical limit**: ~100KB HTML works well
- **For larger apps**: Consider bundling or chunking

### Polling Frequency

- **Default**: 3 seconds
- **Minimum recommended**: 2 seconds
- **Rate limit math**: 60 req/hour ÷ 3s polling = 20 minutes max session (unauthenticated)
- **Solution for longer sessions**: Add GitHub token to viewer

### Multi-File Projects

This system works best with single-file HTML. For multi-file projects:

1. **Bundle first**: Use a bundler to create single HTML
2. **Inline assets**: Base64 encode images, inline CSS/JS
3. **Or**: Extend the system to use multiple Gist files

### Browser Compatibility

| Browser | itty.bitty URL Limit | Status |
|---------|---------------------|--------|
| Firefox | 64,000+ chars | ✅ Full support |
| Chrome | 32,779 chars | ✅ Full support |
| Safari | 80,000+ chars | ✅ Full support |
| Android Chrome | 8,192 chars | ⚠️ Smaller viewers only |
| Edge | 2,083 chars | ❌ Mini viewer only |

---

## Alternative Approaches Tested

### ❌ Tunnel Services (localtunnel, ngrok)

```bash
npm install -g localtunnel
lt --port 3000
# Result: Connection drops immediately in CC Web sandbox
```

**Why it failed**: CC Web sandbox blocks persistent outbound tunnel connections for security.

### ❌ CodePen Prefill API

```bash
curl -X POST "https://codepen.io/pen/define" -d "data={...}"
# Result: 403 Forbidden (Cloudflare blocks)
```

**Why it failed**: CodePen's Cloudflare protection blocks requests from cloud sandbox IPs.

### ❌ Raw GitHub URLs

```javascript
fetch('https://gist.githubusercontent.com/.../raw/file.txt?t=' + Date.now())
// Result: Flip-flops between cached versions
```

**Why it failed**: CDN caching ignores query parameters; different edge servers return different versions.

### ✅ GitHub API (Current Solution)

```javascript
fetch('https://api.github.com/gists/' + gistId)
// Result: Always returns fresh content
```

**Why it works**: API bypasses CDN, returns data directly from GitHub's database.

---

## Files Reference

| File | Purpose |
|------|---------|
| `update-preview-v2.sh` | Push HTML to Gist |
| `viewer-v4.html` | Production viewer (API-based) |
| `viewer-v3.html` | Debug viewer with logging |
| `generate-itty-url.sh` | Create itty.bitty URLs |

---

## Future Improvements

1. **Automatic file watching**: Hook into CC Web's file system events
2. **Multi-file support**: Sync entire directories
3. **Authenticated polling**: For longer sessions without rate limits
4. **WebSocket relay**: Sub-second updates via external service
5. **Diff-based updates**: Only send changed portions

---

## Credits

- [itty.bitty](https://github.com/alcor/itty-bitty) - URL encoding technique
- [GitHub Gist API](https://docs.github.com/en/rest/gists) - Content relay
- LZMA compression algorithm - Efficient encoding
