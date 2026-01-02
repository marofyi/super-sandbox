# Vercel Deployment Guide

Deploy projects to Vercel using GitHub Actions workflows.

## Architecture

Deployments are handled by **GitHub Actions**, not CC Web directly:

| Component | Location | Purpose |
|-----------|----------|---------|
| `VERCEL_TOKEN` | GitHub Secrets | Authentication |
| `VERCEL_ORG_ID` | GitHub Secrets | Organization ID |
| `vercel-setup.yml` | Workflow | Create new projects |
| `vercel-deploy.yml` | Workflow | Manual deploys |
| `deploy-*.yml` | Workflows | Auto-deploy on push |

**Security:** `VERCEL_TOKEN` never enters CC Web environment.

## First-Time Setup

### 1. Add Vercel Secrets to GitHub

Go to **Settings → Secrets → Actions** and add:

| Secret | Value | Source |
|--------|-------|--------|
| `VERCEL_TOKEN` | Your API token | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Your org/team ID | Vercel dashboard → Settings |

### 2. Ensure GH_TOKEN Has Actions Permission

Your `GH_TOKEN` in CC Web needs `actions:write` to dispatch workflows:

```bash
gh workflow list  # Should work
```

## Deploy a New Project

### Step 1: Create Project Files

In CC Web, create your project:

```
projects/my-new-app/
├── index.html      # For static sites
├── package.json    # For webapps
└── ...
```

### Step 2: Run Setup Workflow

From CC Web:

```bash
gh workflow run vercel-setup \
  -f project_name=my-new-app \
  -f project_path=projects/my-new-app
```

Or via GitHub UI: **Actions → Setup Vercel Project → Run workflow**

### Step 3: Check Workflow Summary

After the workflow completes, check the **Summary** tab for:
- Project ID
- Secret name to add

### Step 4: Add Project ID Secret

Add the secret to GitHub:
- **Name:** `VERCEL_PROJECT_ID_MY_NEW_APP`
- **Value:** The project ID from the summary

### Step 5: Create Auto-Deploy Workflow

In CC Web, create `.github/workflows/deploy-my-new-app.yml`:

```yaml
name: Deploy my-new-app

on:
  push:
    branches: [main]
    paths:
      - 'projects/my-new-app/**'
      - 'pnpm-lock.yaml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v4
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
          echo '{"projectId":"${{ secrets.VERCEL_PROJECT_ID_MY_NEW_APP }}","orgId":"${{ secrets.VERCEL_ORG_ID }}"}' > .vercel/project.json

      - name: Deploy to Vercel
        run: pnpm exec vercel deploy --prod --yes --token ${{ secrets.VERCEL_TOKEN }}
```

### Step 6: Push and Deploy

Commit and push. The workflow will auto-deploy on merge to main.

## Manual Redeploy

Use the generic deploy workflow:

```bash
gh workflow run vercel-deploy \
  -f project_name=my-new-app \
  -f project_id_secret=VERCEL_PROJECT_ID_MY_NEW_APP
```

## Workflows Reference

### vercel-setup.yml

Creates a new Vercel project, links it, and does initial deploy.

**Inputs:**
- `project_name` - Name for the Vercel project
- `project_path` - Path in monorepo (e.g., `projects/my-app`)

**Outputs (in Summary):**
- Project ID for adding to secrets

### vercel-deploy.yml

Manual deploy for any project.

**Inputs:**
- `project_name` - Project name
- `project_id_secret` - GitHub secret name containing project ID

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | API token from vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Organization/team ID |
| `VERCEL_PROJECT_ID_<NAME>` | Per-project IDs |

## Monorepo Settings

These are configured automatically by the setup workflow:

| Setting | Value |
|---------|-------|
| `rootDirectory` | `projects/<name>` |
| `sourceFilesOutsideRootDirectory` | `true` |
| `installCommand` | `pnpm install` |

## See Also

- [cc-web.md](./cc-web.md) - Token architecture and network constraints
- [static-html-guide.md](./static-html-guide.md) - Simple static sites
- [README.md](../README.md) - Project overview
