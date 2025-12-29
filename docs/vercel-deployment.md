# Vercel Deployment Guide

Deploy monorepo projects to Vercel using the CLI and GitHub Actions.

## Prerequisites

### Install Vercel CLI

```bash
# As workspace dev dependency (recommended for CI)
pnpm add -wD vercel

# Run via pnpm
pnpm vercel --help

# Or via npx (no install needed)
npx vercel --help
```

## Authentication

**Token-based only** (no browser required):

1. Generate a token at https://vercel.com/account/tokens
2. Use via environment variable:

```bash
export VERCEL_TOKEN=your_token_here
```

## Manual Deployment

```bash
# Navigate to the project
cd projects/example-chat-web

# Deploy to production
pnpm vercel --prod --yes --token=$VERCEL_TOKEN
```

## Environment Variables

### Push from local .env to Vercel

```bash
# Read OPENAI_API_KEY from local .env and add to Vercel
source .env
echo "$OPENAI_API_KEY" | pnpm vercel env add OPENAI_API_KEY production --token=$VERCEL_TOKEN

# Or one-liner using grep
grep '^OPENAI_API_KEY=' .env | cut -d'=' -f2 | pnpm vercel env add OPENAI_API_KEY production --token=$VERCEL_TOKEN
```

### Manage env vars

```bash
# List env vars
pnpm vercel env ls --token=$VERCEL_TOKEN

# Remove an env var
pnpm vercel env rm OPENAI_API_KEY production --token=$VERCEL_TOKEN
```

## GitHub Actions: Selective Deployment

Deploy only when specific projects change. This is the **recommended approach for monorepos**.

### Setup

1. Add `VERCEL_TOKEN` to GitHub repo secrets
2. Add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (get these by running `vercel link` once locally)
3. Add the workflow file below

### Workflow: `.github/workflows/deploy-example-chat-web.yml`

```yaml
name: Deploy example-chat-web

on:
  push:
    branches: [main]
    paths:
      # Trigger only when these paths change
      - 'projects/example-chat-web/**'
      - 'packages/openai-utils/**'  # Shared dependency
      - 'pnpm-lock.yaml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build shared packages
        run: pnpm b @research/openai-utils build

      - name: Deploy to Vercel
        working-directory: projects/example-chat-web
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_EXAMPLE_CHAT_WEB }}
        run: |
          pnpm vercel pull --yes --environment=production --token=$VERCEL_TOKEN
          pnpm vercel build --prod --token=$VERCEL_TOKEN
          pnpm vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
```

### Getting Vercel Project IDs

Run once locally to get the IDs:

```bash
cd projects/example-chat-web
pnpm vercel link --token=$VERCEL_TOKEN
cat .vercel/project.json
```

This outputs:
```json
{"orgId":"team_xxx","projectId":"prj_xxx"}
```

Add these as GitHub secrets:
- `VERCEL_ORG_ID` → `team_xxx`
- `VERCEL_PROJECT_ID_EXAMPLE_CHAT_WEB` → `prj_xxx`

## Adding a New Project

When you add a new project to `projects/`:

1. Create `vercel.json` in the project:
   ```json
   {
     "installCommand": "pnpm install",
     "buildCommand": "pnpm build",
     "framework": "nextjs"
   }
   ```

2. Run `vercel link` to create the Vercel project and get IDs

3. Copy the workflow file, updating:
   - Workflow name
   - `paths` trigger
   - `working-directory`
   - `VERCEL_PROJECT_ID_*` secret name

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm vercel` | Deploy to preview |
| `pnpm vercel --prod` | Deploy to production |
| `pnpm vercel ls` | List deployments |
| `pnpm vercel logs <url>` | View deployment logs |
| `pnpm vercel env ls` | List environment variables |
| `pnpm vercel link` | Link to existing project |

## Troubleshooting

### "No framework detected"
Ensure `vercel.json` has `"framework": "nextjs"` set.

### Build fails with workspace dependency errors
The `vercel.json` should have `"installCommand": "pnpm install"` to properly resolve workspace packages.

### Token permission errors
Ensure your token has "Full Account" scope, not just a specific project.

### GitHub Action not triggering
Check that the `paths` filter matches the files you changed.
