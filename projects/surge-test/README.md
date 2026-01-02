# Surge.sh Speed Test

Benchmark surge.sh deployment speed for AI agent development workflows.

## Quick Start (No Terminal Required)

Surge.sh accounts can be created via API - no interactive CLI login needed.

```bash
# Create account and get token
./onboard.sh your-email@example.com YourPassword123

# Activate credentials
source ~/.surge-credentials

# Deploy test page
./deploy.sh
```

## API Discovery

The surge.sh API auto-creates accounts on first authentication:

```bash
# This creates an account if email doesn't exist, or logs in if it does
curl -s -X POST https://surge.surge.sh/token \
  -H "Content-Type: application/json" \
  -u "email@example.com:password123"

# Response: {"email":"...","token":"..."}
```

This enables fully automated onboarding in sandboxed environments like CC Web.

## Files

| File | Purpose |
|------|---------|
| `onboard.sh` | Create account via API, save credentials |
| `deploy.sh` | Deploy with timing measurement |
| `redeploy.sh` | Quick redeploy to saved domain |
| `index.html` | Test page with timestamp marker |

## What It Measures

- Total CLI deploy time (includes upload + CDN propagation trigger)
- Each deploy injects a new timestamp for visual verification

## Expected Results

| Metric | Surge.sh | Gist+Polling |
|--------|----------|--------------|
| Deploy time | ~2-5s | ~1-2s (push) |
| Visibility delay | ~instant | +3s (poll interval) |
| Total round-trip | ~2-5s | ~4-5s |
| Auth required | Token (one-time setup) | Password per-session |

## Environment Variables

After running `onboard.sh`, these are set:

- `SURGE_LOGIN` - Your email address
- `SURGE_TOKEN` - API token for deployments

Credentials are saved to `~/.surge-credentials` for persistence.
