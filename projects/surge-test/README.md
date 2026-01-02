# Surge.sh Speed Test

Benchmark surge.sh deployment speed for AI agent development workflows.

## Setup

### 1. Get Surge Token

```bash
surge token
```

This will prompt you to login/register and display your token.

### 2. Set Environment Variables

```bash
export SURGE_LOGIN="your-email@example.com"
export SURGE_TOKEN="your-token-here"
```

## Usage

### First Deploy

```bash
./deploy.sh
```

This creates a new surge.sh subdomain and deploys the test page.

### Quick Redeploy

```bash
./redeploy.sh
```

Uses the saved domain for faster iteration testing.

### Custom Domain

```bash
SURGE_DOMAIN="my-test.surge.sh" ./deploy.sh
```

## What It Measures

- Total CLI deploy time (includes upload + CDN propagation trigger)
- Each deploy injects a new timestamp for visual verification

## Expected Results

Based on research:
- Small files: ~2-5 seconds
- Surge claims "publish in seconds" with 8 global CDN regions

## Comparison with Gist Approach

| Metric | Surge.sh | Gist+Polling |
|--------|----------|--------------|
| Deploy time | ~2-5s | ~1-2s (push) |
| Visibility delay | ~instant | +3s (poll interval) |
| Total round-trip | ~2-5s | ~4-5s |
| Auth required | Token in env | Password per-session |

## Files

| File | Purpose |
|------|---------|
| `index.html` | Test page with timestamp marker |
| `deploy.sh` | Deploy with timing measurement |
| `redeploy.sh` | Quick redeploy to saved domain |
| `.surge-domain` | Saved domain (auto-generated) |
| `.build/` | Temp build directory (auto-generated) |
