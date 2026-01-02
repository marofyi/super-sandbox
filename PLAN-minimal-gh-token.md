# Plan: Minimal GH_TOKEN Scope Refactor

Refactor the monorepo so `GH_TOKEN` only needs `actions:write` permission.

## Current State

| Token | Location | Used For |
|-------|----------|----------|
| `GH_TOKEN` | CC Web env | gh CLI (currently broad permissions) |
| `VERCEL_TOKEN` | CC Web env + GitHub Secrets | Vercel deployments |
| `BROWSERLESS_TOKEN` | CC Web env | Browser automation |
| `OPENAI_API_KEY` | CC Web env + GitHub Secrets | Claude + Vercel env vars |

## Target State

| Token | Location | Permissions |
|-------|----------|-------------|
| `GH_TOKEN` | CC Web env | `actions:write` only (+ metadata:read) |
| `VERCEL_TOKEN` | GitHub Secrets only | Team-scoped |
| `BROWSERLESS_TOKEN` | CC Web env | Free account only |
| `OPENAI_API_KEY` | CC Web env + GitHub Secrets | N/A |

## Why This Works

CC Web handles natively (no GH_TOKEN needed):
- ✅ Git push/pull/fetch (via proxy)
- ✅ Create branches
- ✅ Create PRs
- ✅ Read issues

GH_TOKEN only needed for:
- `gh workflow run` → `actions:write`
- `gh workflow list` → `actions:read` (included in write)

## Implementation Steps

### Phase 1: Create Vercel Setup Workflow

**File:** `.github/workflows/vercel-setup.yml`

```yaml
name: Setup Vercel Project

on:
  workflow_dispatch:
    inputs:
      project_name:
        description: 'Project name (e.g., my-new-app)'
        required: true
        type: string
      project_path:
        description: 'Path in monorepo (e.g., projects/my-new-app)'
        required: true
        type: string
      needs_openai:
        description: 'Add OPENAI_API_KEY to Vercel env?'
        required: false
        type: boolean
        default: true

permissions:
  contents: read
  actions: read

jobs:
  setup:
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

      - name: Create Vercel project
        run: |
          pnpm exec vercel project add ${{ inputs.project_name }} \
            --token ${{ secrets.VERCEL_TOKEN }}

      - name: Link project
        run: |
          rm -rf .vercel
          VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link \
            --project ${{ inputs.project_name }} --yes \
            --token ${{ secrets.VERCEL_TOKEN }}

          # Extract and display project ID
          PROJECT_ID=$(cat .vercel/project.json | jq -r '.projectId')
          echo "## Vercel Project Created" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Project ID:** \`$PROJECT_ID\`" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Add this secret to GitHub:" >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
          echo "VERCEL_PROJECT_ID_$(echo '${{ inputs.project_name }}' | tr '-' '_' | tr '[:lower:]' '[:upper:]')" >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY

      - name: Add OPENAI_API_KEY to Vercel
        if: inputs.needs_openai
        run: |
          VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel env add OPENAI_API_KEY production \
            --token ${{ secrets.VERCEL_TOKEN }} <<< "${{ secrets.OPENAI_API_KEY }}"

      - name: Initial deploy
        run: |
          VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel deploy --prod --yes \
            --token ${{ secrets.VERCEL_TOKEN }}

          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Status:** Initial deployment complete ✅" >> $GITHUB_STEP_SUMMARY
```

### Phase 2: Add Manual Deploy Trigger to Existing Workflows

Update `deploy-example-chat-web.yml` and `deploy-tanstack-chat.yml`:

```yaml
on:
  push:
    branches: [main]
    paths: [...]
  workflow_dispatch:  # <-- Add this for manual triggers
```

### Phase 3: Update setup-web-session.sh

Remove `VERCEL_TOKEN` from the unset list (it won't be in env anymore):

```bash
# Remove this line:
echo 'unset VERCEL_TOKEN' >> "$CLAUDE_ENV_FILE"
```

### Phase 4: Update security-hook.py

Remove `VERCEL_TOKEN` from `SENSITIVE_VARS` (not needed if not in env):

```python
SENSITIVE_VARS = [
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    # "VERCEL_TOKEN",  # Removed - not in CC Web env
    "BROWSERLESS_TOKEN",
    "CODESIGN_MCP_TOKEN",
]
```

### Phase 5: Update Documentation

#### docs/cc-web-security.md

Rewrite GH_TOKEN section:

```markdown
#### GitHub Token (`GH_TOKEN`)

##### Minimal Scope: Actions Only

CC Web handles git operations natively. GH_TOKEN is only needed for workflow dispatch.

**Required permissions:**

| Permission | Access | Why Needed |
|------------|--------|------------|
| Actions | Write | `gh workflow run` to trigger deploys |
| Metadata | Read | Auto-granted |

**That's it.** No contents, no PRs, no issues permissions needed.

##### Creating the Token

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Token name**: `Claude Code Web - actions only`
3. **Expiration**: 30 days
4. **Repository access**: Select **"Only select repositories"** → choose your repo
5. **Permissions**: Only enable `Actions: Read and write`

##### Blast Radius if Leaked

With actions-only scope, an attacker can:
- ✅ Trigger workflow runs (cost risk)
- ❌ Cannot push code
- ❌ Cannot create PRs
- ❌ Cannot read issues
- ❌ Cannot access secrets
- ❌ Cannot modify repository
```

#### docs/vercel-deployment.md

Update to reflect workflow-based setup:

```markdown
## Deploy a New Project

### Step 1: Trigger Setup Workflow

From CC Web:
```bash
gh workflow run vercel-setup \
  -f project_name=my-new-app \
  -f project_path=projects/my-new-app \
  -f needs_openai=true
```

Or via GitHub UI: Actions → "Setup Vercel Project" → Run workflow

### Step 2: Add Project ID Secret

Check the workflow run summary for the project ID, then add it:
- Go to Settings → Secrets → Actions
- Add `VERCEL_PROJECT_ID_MY_NEW_APP` with the project ID

### Step 3: Create Deploy Workflow

Create `.github/workflows/deploy-my-new-app.yml` (CC Web can do this).
```

#### .env.example

Update comments:

```bash
# GitHub personal access token (actions:write only - for workflow dispatch)
# GH_TOKEN=ghp_...

# VERCEL_TOKEN - Add to GitHub Secrets, NOT here
# See: Settings → Secrets → Actions
```

### Phase 6: Update README.md

Add setup instructions for new users:

```markdown
## First-Time Setup

### 1. Create GitHub Token (Actions Only)

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. Name: `Claude Code Web`
3. Repository: Select this repo only
4. Permissions: `Actions: Read and write` only
5. Add to Claude Code Web environment as `GH_TOKEN`

### 2. Add Vercel Token to GitHub Secrets

1. Create token at [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Go to repo Settings → Secrets → Actions
3. Add `VERCEL_TOKEN` and `VERCEL_ORG_ID`

### 3. (Optional) Browserless Token

For browser automation, create a free account at browserless.io.
Add `BROWSERLESS_TOKEN` to Claude Code Web environment.

⚠️ Use a dedicated free account - token cannot be scoped.
```

## File Changes Summary

| File | Action |
|------|--------|
| `.github/workflows/vercel-setup.yml` | Create |
| `.github/workflows/deploy-*.yml` | Add `workflow_dispatch` trigger |
| `.claude/scripts/setup-web-session.sh` | Remove VERCEL_TOKEN unset |
| `.claude/scripts/security-hook.py` | Remove VERCEL_TOKEN from list |
| `docs/cc-web-security.md` | Rewrite GH_TOKEN section |
| `docs/vercel-deployment.md` | Update for workflow-based setup |
| `.env.example` | Update comments |
| `README.md` | Add setup instructions |

## Testing Checklist

- [ ] Create fine-grained PAT with only `actions:write`
- [ ] Verify `gh workflow run` works
- [ ] Verify `gh workflow list` works
- [ ] Verify CC Web can still push commits (native)
- [ ] Verify CC Web can still create PRs (native)
- [ ] Test vercel-setup workflow end-to-end
- [ ] Test deploy workflow with `workflow_dispatch`

## Rollback Plan

If issues arise:
1. User can create broader-scoped token temporarily
2. VERCEL_TOKEN can be re-added to CC Web env
3. Documentation includes both approaches
