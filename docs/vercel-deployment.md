# Vercel Deployment Guide

Deploy web projects from this pnpm monorepo to Vercel.

## Prerequisites

Required environment variables (add via Claude Code secrets):

- `VERCEL_TOKEN` - [Create here](https://vercel.com/account/tokens)
- `OPENAI_API_KEY` - For projects using OpenAI

## Deploy a New Project

### Step 1: Create and Link

```bash
rm -rf .vercel

# Create project
pnpm exec vercel project add <project-name> --token "$VERCEL_TOKEN"

# Link (unset env vars to avoid conflicts)
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link \
  --project <project-name> --yes --token "$VERCEL_TOKEN"
```

Note the `projectId` from `.vercel/project.json`.

### Step 2: Add Environment Variables

```bash
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel env add OPENAI_API_KEY production \
  --token "$VERCEL_TOKEN" <<< "$OPENAI_API_KEY"
```

### Step 3: Initial Deploy

```bash
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel deploy --prod --yes \
  --token "$VERCEL_TOKEN"
```

### Step 4: Set Up GitHub Actions

Add GitHub secret for the project:

```bash
gh secret set VERCEL_PROJECT_ID_<PROJECT_NAME> --body "<project-id>" -R <owner>/<repo>
```

Create workflow at `.github/workflows/deploy-<project-name>.yml`:

```yaml
name: Deploy <project-name>

on:
  push:
    branches: [main]
    paths:
      - 'projects/<project-name>/**'
      - 'pnpm-lock.yaml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install

      - name: Create Vercel project link
        run: |
          mkdir -p .vercel
          echo '{"projectId":"${{ secrets.VERCEL_PROJECT_ID_<PROJECT_NAME> }}","orgId":"${{ secrets.VERCEL_ORG_ID }}"}' > .vercel/project.json

      - name: Deploy to Vercel
        run: pnpm exec vercel deploy --prod --yes --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_<PROJECT_NAME> }}
```

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | API token |
| `VERCEL_ORG_ID` | Team/org ID |
| `VERCEL_PROJECT_ID_<NAME>` | Per-project ID |

## Redeploying

```bash
pnpm exec vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

## Current Deployments

| Project | URL | Project ID |
|---------|-----|------------|
| example-chat-web | https://example-chat-web-marofyi.vercel.app | `prj_3ten4pMxczOKsya7GVc3Dh6VhZTr` |
| tanstack-chat | https://tanstack-chat.vercel.app | `prj_ugAj68LssRkhASeqoqqZ4GihVwQI` |

## Monorepo Settings

These are configured automatically when using the CLI:

| Setting | Value |
|---------|-------|
| `rootDirectory` | `projects/<name>` |
| `sourceFilesOutsideRootDirectory` | `true` |
| `installCommand` | `pnpm install` |

## See Also

- [Vercel Monorepos](https://vercel.com/docs/monorepos)
- [Learnings Log](./learnings-log.md) - CLI vs API quirks
