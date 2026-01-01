# CC Web Live Preview

Live preview HTML projects from Claude Code Web sandbox environments.

**Zero auth • Mobile-first • ~3 second latency**

## Quick Start

### 1. Open the Viewer

Copy this URL to your browser or phone:

```
https://itty.bitty.site/#/XQAAAAT//////////wAeCEUG0O+oKBdZ2an16qclPsVsVN2ud3BwM/ScQVFw+mKImRqk8FTfBQp6hIEh2zzW00g8U87EvOVFda2DgCvev1bDjV6fGvIGZOcPT93s8yPaBCQCSlO+coQPTlqGQL3zHmX0oRCkHIzljckSYF08+vIPxWvfDYoyH29Tx9RvS3UIbeEcsK+7MsCrlCRt6EZaNdfodTeOYPeA3eeKHSncOd1SvnG8nd7WSRI5r/obsnmuZZ+LYcGhtm+jB8rz/CGFzyjbbH/WehUYuz7/jrJyJBsU2sYvqsdsp+o0wTQMEo188MC6wPIkmgFj1dcoh/PUgGcfodyvIzRm5MWPFVOwsaHbOySS6EYjt1+241leF3nsdiR4g9GMf7v3xjmwQsnfZrkjfUia2RAxujrj0eirci5/8tuR8+Ev6EU4mpTIW3lhI89dXWAiDUOqzo+Y38ARFrJH6QYOerDzRGpxosDw/Wz5+0CWJqA38WuJ+vNN+CVg0QmQU3HLlqQzAxpxW2v9bn/kA3+R4Z42T8qirqmRkJr4AxQzPMG9yKs6LoK5H8H6WU/X4xP4YBA0o6u1mZ2RJonD5fE0woQc4y/DxGjaeRrCj2V1wX24gDMSSCA3+FdEe78egnpGo98740oJY7oHuyKCwpJ8+Dx1dkh5lPZHWkWBg5YS0MaG9XT2i9FsQVW3j+JHDxD61kbYIgJXdEjW9sIfedMMzy9twioxEeHH00xphJtY/AgjM0GECplrg0YaZlFWirZOA/W0vAX215tnmqPlZjhxZFtiDlc1O6RB/KcYYQ0kx2u/vxmT87pJH1PtWl72LZ9I00wcYPUXw8/NcEGsxG1tVX0bc2BuuXeTQKlnJsgDuyOEPYRkMhskWqJ4NpXMPZtRsGJqSXG9afsUhUxXd6QC6yGJaS1FGVVj3miULJz8Z0yYYxk0YsydGeLBUuLlwx/4d+cwckZjbwb9fqICDHPQ8qF6Dyghq9EWokqDm7ZIgSLO0Gz+Vy2CcIlfRBJh87ORULkf5vjcNMD1lXXoJo8SdXIfGSHQARiUEIzV9re+7umqtxmclh3GJkiJsN/LXeFQ98UaEe5ZG92FRZCunyg33fH7ozDsxy8Xn/WFMevkSxkHOu2QkAkn2ea3OV8p6kSGwtQEG5aIzwoxVR60nwkD+EL41YbyrKH2+80A9MqPHkQJtPuO/NWSQP9RL1nebACyH8f3ywT0kjqUC71NLBOYWXKE1W9LYIuKBh7/TwSDb0OaZIZtiL/nhkyxETD9bqQroGZvQqRt7D2ugk88cEMW1DQd7XzpBEW1f/dYkZ7rih69ook/TegFpId6oKjzRKKr+iFtXV6w0UhpEaIUUdSYBg3vmdEsqS9CA8Hb1QG12S7YMySE0ll7cTDWzCR9fb0b0nAO6KZYcGvUgTVyHDnR7WqWZxTLG+hY29ViDfUNr5yU0YGAVn1ne7wQWWJ7K7DFryXqyy8GXZBxRSICrzHoraJUpugkpDIXA71BaPCeQxNY79MDmgXkkXiMqYsmDVaUY8tVPenZFT+vJYtTwLrzz9XjFgEa0nn7uGEApyqodOgEyE9pZYUOOxTI6l9wjGalZbOKS7LGP8fyeElToBdHfYikz9KwwtTRO9X+MgPA7ZhubeGAo36UeVDU9H1m/xXWUuk9S6fbCBuaUI7PkcbWhs/Ly+sfimin1doU7dRIYR/CA382r/lmEzWiae7rbWWN6cAtET55t8AcxnevFocXKFbjSA57PisGSvPNsMBgIShrKrWoSf/akiFG
```

### 2. Enter Your Gist ID

When prompted, enter a Gist ID (or create one):

```bash
# Create a new Gist
echo "placeholder" > /tmp/preview.txt
gh gist create --public -d "Live Preview" /tmp/preview.txt
# Copy the ID from the URL: gist.github.com/user/THIS_PART
```

### 3. Push Updates

```bash
# Edit update-preview-v2.sh with your Gist ID, then:
./update-preview-v2.sh path/to/your.html
```

Preview updates within 3 seconds.

---

## How It Works

```
CC Web ──▶ GitHub Gist ◀── Viewer (your browser)
  │         (relay)           │
  │                           │
  └── gh gist edit ──────────┘── polls API every 3s
```

1. **CC Web** pushes HTML to a GitHub Gist
2. **Viewer** polls the GitHub API (not raw URLs - those have CDN caching issues)
3. **Viewer** renders content in an iframe using `srcdoc`

See [TECHNICAL.md](./TECHNICAL.md) for detailed architecture and explanations.

---

## Encrypted Mode (Private Content)

For private content, use encrypted mode - content is AES-256 encrypted before upload:

```bash
./update-preview-encrypted.sh index.html "your-password"
```

Open the v5 viewer and enter the same password. The Gist only contains ciphertext - unreadable without the password.

See [TECHNICAL.md](./TECHNICAL.md#encrypted-mode) for cryptographic details.

---

## Files

| File | Purpose |
|------|---------|
| `update-preview-v2.sh` | Push HTML to Gist (plaintext) |
| `update-preview-encrypted.sh` | Push encrypted HTML to Gist |
| `viewer-v4.html` | Production viewer (plaintext) |
| `viewer-v5.html` | Encrypted viewer (password required) |
| `viewer-v3.html` | Debug viewer with logs |
| `generate-itty-url.sh` | Generate itty.bitty URLs |
| `TECHNICAL.md` | Full technical documentation |

---

## Why This Approach?

| Approach | Result |
|----------|--------|
| localtunnel/ngrok | ❌ Blocked by sandbox |
| CodePen API | ❌ Cloudflare blocks |
| Raw GitHub URLs | ❌ CDN caching issues |
| **GitHub API + Gist** | ✅ Works perfectly |

---

## Limitations

- Best for single-file HTML (multi-file needs bundling)
- 60 API requests/hour unauthenticated (~20 min continuous polling)
- Content should be < 100KB for best performance

---

## License

MIT
