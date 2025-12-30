---
name: vercel-deploy
description: Deploy web projects to Vercel. Use when deploying projects, setting up new Vercel projects, configuring environment variables, or troubleshooting deployment issues.
allowed-tools: Read Bash Glob
---

# Vercel Deployment

Deploy web projects from this monorepo to Vercel using CLI-first workflows.

## Deploy Existing Project

```bash
# From monorepo root
pnpm exec vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

## Create New Project

```bash
# Clear any existing config
rm -rf .vercel

# Create and link project (unset env vars to avoid conflicts)
pnpm exec vercel project add <name> --token "$VERCEL_TOKEN"
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link --project <name> --yes --token "$VERCEL_TOKEN"
```

## Add Environment Variables

```bash
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel env add OPENAI_API_KEY production --token "$VERCEL_TOKEN" <<< "$OPENAI_API_KEY"
```

## Current Deployments

| Project | URL |
|---------|-----|
| example-chat-web | https://example-chat-web-marofyi.vercel.app |
| tanstack-chat | https://tanstack-chat.vercel.app |

## GitHub Actions Setup

1. Add repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_<NAME>`
2. Create workflow at `.github/workflows/deploy-<name>.yml`
3. Use `-R owner/repo` flag in CC Web (git remotes point to proxy)

## Key Points

- Build runs from monorepo root
- `sourceFilesOutsideRootDirectory=true` required (CLI sets it automatically)
- API-based setup is unreliable; prefer CLI commands
- See `docs/vercel-deployment.md` for full guide
