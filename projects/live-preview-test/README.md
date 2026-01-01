# CC Web Live Preview

A zero-auth, mobile-first solution for live previewing HTML projects from CC Web.

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CC Web    │────▶│ GitHub Gist │◀────│  Viewer     │
│             │     │ (stores     │     │  (polls     │
│ update-     │     │  itty.bitty │     │   every 2s) │
│ preview.sh  │     │  URL)       │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      │                                        │
      │         ┌──────────────────┐          │
      └────────▶│ On file change:  │          │
                │ 1. LZMA compress │          │
                │ 2. Base64 encode │          │
                │ 3. Update Gist   │          │
                └──────────────────┘          │
                                              ▼
                                    ┌──────────────────┐
                                    │ 1. Fetch Gist    │
                                    │ 2. Load itty.bty │
                                    │ 3. Render iframe │
                                    └──────────────────┘
```

**Latency:** ~2-4 seconds from file change to preview update

## Quick Start

### 1. Open the Viewer (on your phone/browser)

**Option A:** Use the self-contained viewer URL:
```
https://itty.bitty.site/#/XQAAAAT//////////wAeCEUG0O+oKBdZ2an16qclQGqN7T6CIDyxE+11cC6bHnvxMZIjSBfWDM0Z8rbbT1ctfBJX2JDR5NyMdAk3BJqvzET2UztDLvXPcd59QvWmcGApiT6wxYDgL8DyJlY0C06rLDoYuvSTFjgg5kRN3yF017kkf2SSSyXK2BRquUaTGw6Lo/5zrJb4y/7c9nnvMJUAqJUtFrQf+zj8MAXQ8D5dFbXmgijium6ZyFeTvYvM6Y4G9b19kgAoS/qKyHHiEIV4mXxt/qo5IDEStvO+BNrX66rBBbW5Mg4C62xcZIsRqq0VKEGnkdwQq9h0kZD/kSYl+G6h4CmmT2tiCgYukX4A+hDV23AIjEWybVY6dhn5q3Y/gASIgPlRHeYI9qPZDJ0RwODak8Bq8i1HoV6kYMdpctwJtAPUk8lGkagZkAlAIME5Kw+LlLaoX03WeZAuqmzH3WShV+UJCnIdq0wPTKueZFxdIRqttCo58Jhzp+aRcaPsjJkJXX1w13inEWsCshenBOyIDrgQJ3/U0JEANsghA0VnKVcvCNEEtfRPtTANHFtblthmxks7SMBnFzEwhzro/hSXlgFXj3B2qeDkXYFlzJ2krgyAj6d40f17mypUZTdYJUeI/MpvCejidDSz1JEYXcSK6x75gk0vDwZPZ3LMOcGU4ijjSPXqW2X7KIlnP2A9UpQ+KVVk/HZd+hL8PuNCVGPQK3mdRq8f/61rqLqg6p4dCA1nM5pSkjM83YsuDeQx7Cqj1mcWb4vONdC+Edes0eDxmya4NTx0J3Xh9NAIBx++CbEtwWWjY9Sz7Ov++t47ovKFQWva2ukj8jsTvBZUduJXYhPjPzB/5Ch0/EpSN1QwKnbixjRlj+6ghai4nz+KwjO3VkZLQ5Q5lqzeztsDefBkjC53ymcsISH/+sv7uQ==
```

**Option B:** Open `viewer-mini.html` if you have it hosted elsewhere.

### 2. Enter the Gist URL

When you first set up, create a Gist and note its raw URL:
```
https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw/preview-url.txt
```

### 3. Push Updates from CC Web

```bash
./update-preview.sh path/to/your/file.html
```

The viewer will automatically pick up changes within 2 seconds.

## Files

| File | Purpose |
|------|---------|
| `generate-itty-url.sh` | Compresses HTML → itty.bitty URL |
| `update-preview.sh` | Runs generate + updates Gist |
| `viewer-mini.html` | Minimal polling viewer (940 chars encoded) |
| `viewer-standalone.html` | Full-featured viewer with better UX |

## Setup Your Own Gist

```bash
# Create a new Gist
echo "placeholder" > /tmp/preview-url.txt
gh gist create --public -d "Live Preview URL" /tmp/preview-url.txt

# Note the Gist ID from the URL, then update update-preview.sh
```

## Limitations

- **URL size limits:** Encoded content should stay under 8KB for mobile compatibility (Android limit)
- **Gist polling:** GitHub may rate-limit aggressive polling (2s interval is safe)
- **Complex apps:** Works best with single-file HTML; multi-file apps need bundling

## Alternatives Explored

| Approach | Result |
|----------|--------|
| localtunnel | ❌ Connections drop in CC Web sandbox |
| ngrok | ❌ Exits immediately |
| CodePen API | ❌ Blocked by Cloudflare from CC Web |
| GitHub Pages | ❌ Requires public repos |
| **Gist + itty.bitty** | ✅ Works! |

## Credits

- [itty.bitty](https://github.com/alcor/itty-bitty) for LZMA URL encoding
- GitHub Gist for free, instant content hosting
