---
name: vercel
description: Deploy and manage projects on Vercel via CLI. Fast ~10s deploys, environment variables, logs, rollback, and more.
compatibility: Requires vercel CLI, authentication via login or VERCEL_TOKEN
metadata:
  author: super-sandbox
  version: "4.0"
---

# Vercel Skill

Deploy and manage projects on Vercel for instant preview and hosting.

## Requirements

- **vercel CLI** - Install with `npm install -g vercel`
- **Authentication** - Either:
  - `vercel login` (interactive, opens browser)
  - `VERCEL_TOKEN` environment variable (for CI/CC Web)

For CC Web, see [docs/cloud-environments.md](../../docs/cloud-environments.md) for token setup.

## Scripts

| Script | Purpose |
|--------|---------|
| `setup.sh` | First-time setup: create and link Vercel project |
| `push.sh` | Deploy updates to production (~10s) |
| `list.sh` | List all Vercel projects in your account |
| `inspect.sh` | Show deployment info and build logs |
| `logs.sh` | Stream runtime logs (Middleware, Functions) |
| `env.sh` | Manage environment variables |
| `rollback.sh` | Revert to a previous deployment |
| `teardown.sh` | Remove a Vercel project |

## Quick Reference

```bash
# Deploy workflow
./skills/vercel/scripts/setup.sh projects/my-app    # First time
./skills/vercel/scripts/push.sh projects/my-app     # Updates

# Project management
./skills/vercel/scripts/list.sh                     # List all projects
./skills/vercel/scripts/list.sh --json              # JSON output
./skills/vercel/scripts/teardown.sh my-project      # Delete project

# Debugging
./skills/vercel/scripts/inspect.sh https://my-app.vercel.app
./skills/vercel/scripts/inspect.sh https://my-app.vercel.app --logs
./skills/vercel/scripts/logs.sh https://my-app.vercel.app

# Environment variables
./skills/vercel/scripts/env.sh projects/my-app ls
./skills/vercel/scripts/env.sh projects/my-app add API_KEY production
./skills/vercel/scripts/env.sh projects/my-app rm API_KEY
./skills/vercel/scripts/env.sh projects/my-app pull

# Rollback
./skills/vercel/scripts/rollback.sh                 # Previous deployment
./skills/vercel/scripts/rollback.sh dpl_abc123      # Specific deployment
```

## Deployment Workflow

### Step 1: Check for Existing Setup

```bash
if [ -f "path/to/project/.vercel/project.json" ]; then
  # Already linked, proceed to push
else
  # Run first-time setup
fi
```

### Step 2: First-Time Setup (if needed)

```bash
./skills/vercel/scripts/setup.sh projects/my-app
```

This will:
1. Create a Vercel project
2. Link the directory (creates `.vercel/project.json`)
3. Do initial production deploy
4. Return the permanent URL

After setup, return the URL to the user:
```
https://my-app.vercel.app
```

Tell the user: "Open this URL in your browser. I'll deploy updates when you make changes."

### Step 3: Push Updates

```bash
./skills/vercel/scripts/push.sh projects/my-app
```

Deploys take ~10 seconds. Tell the user to refresh their browser.

## Project Structure

Vercel stores its config in the project directory:

```
projects/my-app/
├── index.html
├── style.css (optional)
├── script.js (optional)
└── .vercel/
    └── project.json  # Created by setup, links to Vercel project
```

The `.vercel/` directory is auto-added to `.gitignore`.

## Script Details

### list.sh

List all Vercel projects in your account.

```bash
./skills/vercel/scripts/list.sh           # Human-readable
./skills/vercel/scripts/list.sh --json    # JSON for parsing
```

### inspect.sh

Show deployment information or build logs.

```bash
./skills/vercel/scripts/inspect.sh <url-or-id> [options]

Options:
  --logs, -l    Show build logs instead of info
  --wait, -w    Wait for deployment to complete
```

### logs.sh

Stream runtime logs (from Middleware and Vercel Functions).

```bash
./skills/vercel/scripts/logs.sh <url-or-id>
```

Streams for up to 5 minutes. Press Ctrl+C to stop.

**Note:** For build logs, use `inspect.sh --logs` instead.

### env.sh

Manage environment variables for a linked project.

```bash
./skills/vercel/scripts/env.sh <project-path> <action> [name] [environment]

Actions:
  ls      List all environment variables
  add     Add variable (prompts for value)
  rm      Remove variable
  pull    Download .env file
```

### rollback.sh

Roll back production to a previous deployment.

```bash
./skills/vercel/scripts/rollback.sh                    # Previous deployment
./skills/vercel/scripts/rollback.sh <url-or-id>        # Specific deployment
./skills/vercel/scripts/rollback.sh --timeout 60       # Custom timeout
```

**Note:** On Hobby plan, only rollback to immediately previous deployment is supported.

### teardown.sh

Remove a Vercel project and its deployments.

```bash
./skills/vercel/scripts/teardown.sh <project-name>
./skills/vercel/scripts/teardown.sh <project-name> --safe  # Preserve active URLs
```

## Troubleshooting

**"Not logged in to Vercel":**
- Run `vercel login` interactively, OR
- Set `VERCEL_TOKEN` environment variable

**"Project not linked":**
- Run setup.sh first to create and link the project

**Deploy taking too long:**
- Normal deploy time is ~10 seconds
- Large files or many assets may take longer

**URL not updating after deploy:**
- Vercel edge caching is usually instant
- Try hard refresh (Cmd+Shift+R)

**Runtime logs empty:**
- Runtime logs only show Middleware and Vercel Functions output
- Static HTML projects don't produce runtime logs
- For build logs, use `inspect.sh --logs`

## Comparison with Alternatives

| Approach | Deploy Time | Rate Limits | Complexity |
|----------|-------------|-------------|------------|
| **Vercel** | ~10s | None | Simple |
| GitHub Pages | ~30-60s | None | Medium (needs git push) |
