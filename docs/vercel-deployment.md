# Vercel Deployment Guide

This guide covers deploying web projects from this pnpm monorepo to Vercel.

## Key Concepts

### Monorepo Structure

Each deployable web project in `projects/` gets its own **separate Vercel Project**. This allows:

- Independent deployments per project
- Project-specific environment variables
- Separate deployment URLs and domains

### Critical Configuration

Vercel monorepo deployments require specific settings configured via the **Vercel API** (not `vercel.json`):

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

### Step 1: Create Vercel Project

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
    "buildCommand": "pnpm --filter @research/openai-utils build && pnpm --filter @research/<project-name> build",
    "publicSource": false
  }'
```

Save the returned `id` (e.g., `prj_xxxxx`) for subsequent commands.

### Step 2: Configure Project Settings

Ensure source files outside root directory are accessible:

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<PROJECT_ID>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceFilesOutsideRootDirectory": true,
    "ssoProtection": null
  }'
```

Setting `ssoProtection` to `null` makes deployments publicly accessible.

### Step 3: Add Environment Variables

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

### Step 4: Link and Deploy

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

## Existing Deployments

### example-chat-web

| Property | Value |
|----------|-------|
| Project ID | `prj_3ten4pMxczOKsya7GVc3Dh6VhZTr` |
| URL | https://research-marofyi.vercel.app |
| Root Directory | `projects/example-chat-web` |

## Troubleshooting

### "No Next.js version detected"

**Cause**: `rootDirectory` not set, or Vercel can't find `package.json` with Next.js dependency.

**Fix**: Ensure `rootDirectory` is set via API to the project subdirectory.

### "workspace:* dependency not found"

**Cause**: `pnpm install` ran from project directory instead of monorepo root.

**Fix**: Set `installCommand` to `pnpm install` (it runs from monorepo root when `rootDirectory` is set).

### 401 Unauthorized on deployment URL

**Cause**: SSO protection is enabled on the Vercel project.

**Fix**:
```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<PROJECT_ID>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -d '{"ssoProtection": null}'
```

### Turbopack workspace root errors

**Cause**: Next.js 16+ with Turbopack may have issues detecting monorepo structure.

**Fix**: Usually resolved by proper `rootDirectory` and `sourceFilesOutsideRootDirectory` settings. If issues persist, the build will still work as Turbopack handles this automatically when configured correctly.

## Redeploying

```bash
# From monorepo root (with .vercel/project.json configured)
pnpm exec vercel deploy --prod --yes --token "$VERCEL_TOKEN"

# Force rebuild without cache
pnpm exec vercel deploy --prod --yes --force --token "$VERCEL_TOKEN"
```

## References

- [Vercel Monorepos Documentation](https://vercel.com/docs/monorepos)
- [Vercel pnpm/Corepack Support](https://vercel.com/changelog/improved-support-for-pnpm-corepack-and-monorepos)
- [Vercel API Reference](https://vercel.com/docs/rest-api)
