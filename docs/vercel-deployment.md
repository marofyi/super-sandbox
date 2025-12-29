# Vercel Deployment Guide

This guide covers deploying web projects from this pnpm monorepo to Vercel.

## Key Concepts

### Monorepo Structure

Each deployable web project in `projects/` gets its own **separate Vercel Project**. This allows:

- Independent deployments per project
- Project-specific environment variables
- Separate deployment URLs and domains

### Critical Configuration

Vercel monorepo deployments require specific settings. These can be configured via **Vercel API** or **CLI**:

- `vercel link` requires interactive project selection (no `--project` flag) - but `vercel project add` works headlessly
- Project settings like `rootDirectory` can be set via API, dashboard, or auto-detected
- **Recommended**: Use CLI for project creation and linking; API can be unreliable

Once a project is configured, **deployments use the CLI** (`vercel deploy --yes --token`).

| Setting | Value | Why |
|---------|-------|-----|
| `rootDirectory` | `projects/<name>` | Points Vercel to the project subdirectory |
| `sourceFilesOutsideRootDirectory` | `true` | Allows access to workspace packages in `packages/` |
| `installCommand` | `pnpm install` | Runs from monorepo root, resolves workspace deps |
| `buildCommand` | See below | Must build dependencies before the target project |
| `framework` | `nextjs` (or appropriate) | Enables framework-specific optimizations |

### Build Command Pattern

Always build workspace dependencies before the target project:

```bash
pnpm --filter @research/openai-utils build && pnpm --filter @research/<project> build
```

## Deploying a New Web Project

### Prerequisites

Required environment variables (add via Claude Code secrets for web sessions):

- `VERCEL_TOKEN` - Vercel API token ([create here](https://vercel.com/account/tokens))
- `OPENAI_API_KEY` - For projects using OpenAI (or other required keys)

### Recommended: CLI-Based Deployment

This approach is more reliable than the API-based method, especially in Claude Code Web.

**Deployment consists of 4 steps:**
1. Create and link project
2. Add environment variables
3. Initial deploy (manual)
4. **Set up GitHub Actions for auto-deploy** (required)

#### Step 1: Create and Link Project

```bash
# Remove any existing .vercel folder
rm -rf .vercel

# Create the project (headless, no interaction required)
pnpm exec vercel project add <project-name> --token "$VERCEL_TOKEN"

# IMPORTANT: Temporarily unset env vars to avoid conflicts
# (If VERCEL_ORG_ID is set without VERCEL_PROJECT_ID, CLI will fail)
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link \
  --project <project-name> --yes --token "$VERCEL_TOKEN"
```

After linking, note the `projectId` from `.vercel/project.json` - you'll need it for Step 4.

#### Step 2: Add Environment Variables

```bash
# Add via CLI (more reliable than API)
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel env add OPENAI_API_KEY production \
  --token "$VERCEL_TOKEN" <<< "$OPENAI_API_KEY"
```

#### Step 3: Initial Deploy

```bash
# Deploy to production
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel deploy --prod --yes \
  --token "$VERCEL_TOKEN"
```

#### Step 4: Set Up GitHub Actions (Required)

**This step is mandatory.** Without it, changes pushed to `main` won't trigger deployments.

1. **Add GitHub secret** for the project:
   ```bash
   gh secret set VERCEL_PROJECT_ID_<PROJECT_NAME> --body "<project-id>"
   ```

   Example: `VERCEL_PROJECT_ID_TANSTACK_CHAT` with value `prj_ugAj68LssRkhASeqoqqZ4GihVwQI`

2. **Create workflow file** at `.github/workflows/deploy-<project-name>.yml`:
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

3. **Commit and push** the workflow file

### Alternative: API-Based Deployment

Use this if CLI commands fail. Note: API authentication can be unreliable.

#### Step 1: Create Vercel Project

```bash
# Create the project via API
curl -X POST "https://api.vercel.com/v10/projects" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<project-name>",
    "framework": "nextjs",
    "rootDirectory": "projects/<project-name>",
    "installCommand": "pnpm install",
    "buildCommand": "pnpm --filter @research/<project-name> build",
    "publicSource": false
  }'
```

Save the returned `id` (e.g., `prj_xxxxx`) for subsequent commands.

#### Step 2: Configure Project Settings

Ensure source files outside root directory are accessible:

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<PROJECT_ID>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceFilesOutsideRootDirectory": true}'
```

#### Step 3: Add Environment Variables

```bash
# Add each required environment variable
curl -X POST "https://api.vercel.com/v10/projects/<PROJECT_ID>/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"OPENAI_API_KEY\",
    \"value\": \"\$OPENAI_API_KEY\",
    \"type\": \"encrypted\",
    \"target\": [\"production\", \"preview\", \"development\"]
  }"
```

#### Step 4: Link and Deploy

From the **monorepo root**:

```bash
# Remove any existing .vercel folder
rm -rf .vercel

# Create .vercel/project.json manually (non-interactive)
mkdir -p .vercel
cat > .vercel/project.json << PROJ
{
  "projectId": "<PROJECT_ID>",
  "orgId": "<ORG_ID>",
  "projectName": "<project-name>"
}
PROJ

# Deploy
pnpm exec vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

## Project Configuration Files

### vercel.json (in project directory)

Keep it minimal—settings are configured via API:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

### next.config.ts (for Next.js projects)

Enable transpilation of workspace packages:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@research/openai-utils'],
};

export default nextConfig;
```

## Framework-Specific Notes

### Next.js Projects

Standard Next.js projects work with the default settings. Set `framework: "nextjs"` in the API or let Vercel auto-detect.

### TanStack Start / Nitro Projects

TanStack Start uses Vite + Nitro for SSR. Vercel auto-detects this correctly:

- **No `vercel.json` required** - Nitro auto-generates `.vercel/output`
- **Build output**: Nitro creates serverless functions automatically
- **Framework detection**: Set to `null` or omit; Vercel detects Nitro preset

Example build output structure:
```
.vercel/output/
├── static/           # Client assets
└── functions/        # Serverless functions
    └── __fallback.func/
```

**Note**: You may see this warning during build (safe to ignore):
```
[warn] [nitro] Please add `compatibilityDate: '2025-12-29'` to the config file.
```

## Existing Deployments

### example-chat-web (Next.js)

| Property | Value |
|----------|-------|
| Project ID | `prj_3ten4pMxczOKsya7GVc3Dh6VhZTr` |
| URL | https://example-chat-web-marofyi.vercel.app |
| Root Directory | `projects/example-chat-web` |
| Framework | Next.js |

### tanstack-chat (TanStack Start)

| Property | Value |
|----------|-------|
| Project ID | `prj_ugAj68LssRkhASeqoqqZ4GihVwQI` |
| URL | https://tanstack-chat.vercel.app |
| Root Directory | `projects/tanstack-chat` |
| Framework | TanStack Start (Vite + Nitro) |

## Troubleshooting

### "No Next.js version detected"

**Cause**: `rootDirectory` not set, or Vercel can't find `package.json` with Next.js dependency.

**Fix**: Ensure `rootDirectory` is set via API to the project subdirectory.

### "workspace:* dependency not found"

**Cause**: `pnpm install` ran from project directory instead of monorepo root.

**Fix**: Set `installCommand` to `pnpm install` (it runs from monorepo root when `rootDirectory` is set).

### Turbopack workspace root errors

**Cause**: Next.js 16+ with Turbopack may have issues detecting monorepo structure.

**Fix**: Usually resolved by proper `rootDirectory` and `sourceFilesOutsideRootDirectory` settings. If issues persist, the build will still work as Turbopack handles this automatically when configured correctly.

### "You specified VERCEL_ORG_ID but forgot to specify VERCEL_PROJECT_ID"

**Cause**: Environment has `VERCEL_ORG_ID` set (e.g., from Claude Code secrets) but no `VERCEL_PROJECT_ID`. The CLI requires both or neither.

**Fix**: Temporarily unset both when running CLI commands:
```bash
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link --project <name> --yes --token "$VERCEL_TOKEN"
```

### API returns "missingToken" or "invalidToken"

**Cause**: Vercel API authentication can be unreliable, especially with token passing through environment variables.

**Fix**: Use CLI commands instead of direct API calls. The CLI handles authentication more reliably:
```bash
# Instead of curl API calls, use:
pnpm exec vercel project add <name> --token "$VERCEL_TOKEN"
pnpm exec vercel env add <KEY> production --token "$VERCEL_TOKEN"
```

### API calls return empty responses

**Cause**: API calls may silently fail or return empty responses without error messages.

**Fix**:
1. Verify token is valid by running a simple CLI command first
2. Use CLI-based deployment workflow instead of API
3. Check Vercel dashboard for project status if unsure

## Redeploying

```bash
# From monorepo root (with .vercel/project.json configured)
pnpm exec vercel deploy --prod --yes --token "$VERCEL_TOKEN"

# Force rebuild without cache
pnpm exec vercel deploy --prod --yes --force --token "$VERCEL_TOKEN"
```

## Auto-Deploy with GitHub Actions

All web projects use **GitHub Actions** for automatic deployments. This ensures:

- Fully headless CI/CD (works with Claude Code Web)
- Consistent deployment process across all projects
- No interactive Vercel dashboard setup required

### Architecture: One Workflow Per Project

Each web project gets its own workflow file. This keeps deployments independent and failures isolated.

```
.github/workflows/
├── deploy-example-chat-web.yml
├── deploy-tanstack-chat.yml
└── ...
```

### Workflow Template

Create a workflow file for each web project:

```yaml
# .github/workflows/deploy-example-chat-web.yml
name: Deploy example-chat-web

on:
  push:
    branches: [main]
    paths:
      - 'projects/example-chat-web/**'
      - 'packages/openai-utils/**'  # Shared dependency
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
          echo '{"projectId":"${{ secrets.VERCEL_PROJECT_ID_EXAMPLE_CHAT_WEB }}","orgId":"${{ secrets.VERCEL_ORG_ID }}"}' > .vercel/project.json

      - name: Deploy to Vercel
        run: pnpm exec vercel deploy --prod --yes --token ${{ secrets.VERCEL_TOKEN }}
```

### Required GitHub Secrets

**Shared (one per repo):**

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | API token from [Vercel Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Team/org ID (same for all projects) |

**Per project:**

| Secret | Description |
|--------|-------------|
| `VERCEL_PROJECT_ID_<PROJECT_NAME>` | Project ID (e.g., `VERCEL_PROJECT_ID_EXAMPLE_CHAT_WEB`) |

### Adding Secrets via CLI

Use `gh secret set` to add secrets headlessly:

```bash
# Shared secrets (one-time setup)
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "<ORG_ID>"

# Per-project secret (for each web project)
gh secret set VERCEL_PROJECT_ID_EXAMPLE_CHAT_WEB --body "<PROJECT_ID>"
```

You can find the org ID and project ID in `.vercel/project.json` after linking, or from the Vercel API response when creating a project.

### Adding a New Web Project to CI/CD

1. Create and configure the Vercel project (see Steps 1-3 above)
2. Add GitHub secret: `VERCEL_PROJECT_ID_<PROJECT_NAME>` with the project ID
3. Create workflow file: `.github/workflows/deploy-<project-name>.yml`
4. Update paths to include the project directory and any shared dependencies
5. Commit and push the workflow file

### Current Workflow Status

| Project | Workflow | Secret Required |
|---------|----------|-----------------|
| example-chat-web | `deploy-example-chat-web.yml` | `VERCEL_PROJECT_ID_EXAMPLE_CHAT_WEB` |
| tanstack-chat | `deploy-tanstack-chat.yml` | `VERCEL_PROJECT_ID_TANSTACK_CHAT` |

## References

- [Vercel Monorepos Documentation](https://vercel.com/docs/monorepos)
- [Vercel pnpm/Corepack Support](https://vercel.com/changelog/improved-support-for-pnpm-corepack-and-monorepos)
- [Vercel API Reference](https://vercel.com/docs/rest-api)
- [Deploying with GitHub Actions](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)
