# Plan: Radical Monorepo Refactor

**Goal:** Minimal token surface + lean codebase focused on core purpose.

## Core Purpose (After Refactor)

> Rapidly prototype and deploy static HTML and webapps to Vercel, with Browserless for live e2e testing.

**That's it.** Everything else goes.

---

## What Gets Removed

### Packages
| Package | Action | Reason |
|---------|--------|--------|
| `packages/openai-utils` | DELETE | Not needed for static/webapp deploys |

### Projects
| Project | Action | Reason |
|---------|--------|--------|
| `projects/example-chat` | DELETE | OpenAI demo, not core |
| `projects/example-chat-web` | DELETE | OpenAI Next.js demo, not core |
| `projects/tanstack-chat` | DELETE | Multi-provider chat, not core |
| `projects/the-intelligence-economy` | KEEP | Static HTML showcase |
| `projects/live-preview-test` | KEEP | CC Web preview utility |

### Workflows
| Workflow | Action | Reason |
|----------|--------|--------|
| `.github/workflows/deploy-example-chat-web.yml` | DELETE | Project removed |
| `.github/workflows/deploy-tanstack-chat.yml` | DELETE | Project removed |
| `.github/workflows/update-docs.yml` | KEEP | Docs automation |
| `.github/workflows/update-index.yml` | KEEP | Index automation |

### Tokens/Env Vars
| Token | Action | Reason |
|-------|--------|--------|
| `OPENAI_API_KEY` | REMOVE ENTIRELY | No OpenAI usage |
| `ANTHROPIC_API_KEY` | REMOVE ENTIRELY | No Anthropic usage |
| `GEMINI_API_KEY` | REMOVE ENTIRELY | No Gemini usage |
| `VERCEL_TOKEN` | MOVE TO GITHUB SECRETS | Not needed in CC Web |
| `GH_TOKEN` | KEEP (actions:write only) | Workflow dispatch |
| `BROWSERLESS_TOKEN` | KEEP | Core e2e testing |

---

## What Remains (After Refactor)

```
research/
├── .claude/
│   ├── scripts/
│   │   ├── setup-web-session.sh    # Simplified
│   │   └── security-hook.py        # Simplified
│   └── settings.json
├── .github/workflows/
│   ├── vercel-setup.yml            # NEW - project setup
│   ├── vercel-deploy.yml           # NEW - generic deploy
│   ├── update-docs.yml
│   └── update-index.yml
├── packages/
│   └── browserless/                # Core e2e utility
├── projects/
│   ├── the-intelligence-economy/   # Static HTML example
│   └── live-preview-test/          # CC Web utility
├── docs/
│   ├── cc-web.md
│   ├── cc-web-security.md          # Updated
│   ├── browserless.md
│   ├── vercel-deployment.md        # Updated
│   └── static-html-guide.md
├── .env.example                    # Simplified
├── README.md                       # Rewritten
└── index.html                      # Landing page
```

---

## Token Architecture (After Refactor)

| Token | Location | Permissions | Purpose |
|-------|----------|-------------|---------|
| `GH_TOKEN` | CC Web env | `actions:write` | Dispatch workflows |
| `BROWSERLESS_TOKEN` | CC Web env | Full (free account) | E2E testing |
| `VERCEL_TOKEN` | GitHub Secrets | Team-scoped | Deployments |
| `VERCEL_ORG_ID` | GitHub Secrets | N/A | Vercel org |

**No API keys in CC Web.** Only action tokens.

---

## Implementation Phases

### Phase 1: Delete OpenAI/Chat Projects

```bash
# Remove packages
rm -rf packages/openai-utils

# Remove projects
rm -rf projects/example-chat
rm -rf projects/example-chat-web
rm -rf projects/tanstack-chat

# Remove workflows
rm .github/workflows/deploy-example-chat-web.yml
rm .github/workflows/deploy-tanstack-chat.yml
```

### Phase 2: Create Vercel Workflows

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

permissions:
  contents: read

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

      - name: Create and link Vercel project
        run: |
          pnpm exec vercel project add ${{ inputs.project_name }} \
            --token ${{ secrets.VERCEL_TOKEN }}

          rm -rf .vercel
          VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link \
            --project ${{ inputs.project_name }} --yes \
            --token ${{ secrets.VERCEL_TOKEN }}

      - name: Extract project ID
        id: project
        run: |
          PROJECT_ID=$(cat .vercel/project.json | jq -r '.projectId')
          echo "id=$PROJECT_ID" >> $GITHUB_OUTPUT

          # Summary for user
          echo "## Vercel Project Created" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Project:** ${{ inputs.project_name }}" >> $GITHUB_STEP_SUMMARY
          echo "**Project ID:** \`$PROJECT_ID\`" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Next Steps" >> $GITHUB_STEP_SUMMARY
          echo "1. Add secret \`VERCEL_PROJECT_ID_$(echo '${{ inputs.project_name }}' | tr '-' '_' | tr '[:lower:]' '[:upper:]')\` = \`$PROJECT_ID\`" >> $GITHUB_STEP_SUMMARY
          echo "2. Create deploy workflow in CC Web" >> $GITHUB_STEP_SUMMARY

      - name: Initial deploy
        run: |
          VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel deploy --prod --yes \
            --token ${{ secrets.VERCEL_TOKEN }}

          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Initial deploy:** ✅ Complete" >> $GITHUB_STEP_SUMMARY
```

**File:** `.github/workflows/vercel-deploy.yml`

```yaml
name: Deploy to Vercel

on:
  workflow_dispatch:
    inputs:
      project_name:
        description: 'Project name'
        required: true
        type: string
      project_id_secret:
        description: 'GitHub secret name for project ID (e.g., VERCEL_PROJECT_ID_MY_APP)'
        required: true
        type: string

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
          echo '{"projectId":"${{ secrets[inputs.project_id_secret] }}","orgId":"${{ secrets.VERCEL_ORG_ID }}"}' > .vercel/project.json

      - name: Deploy
        run: pnpm exec vercel deploy --prod --yes --token ${{ secrets.VERCEL_TOKEN }}
```

### Phase 3: Simplify Security Scripts

**File:** `.claude/scripts/setup-web-session.sh`

Remove these unset lines:
```bash
# REMOVE:
echo 'unset OPENAI_API_KEY' >> "$CLAUDE_ENV_FILE"
echo 'unset ANTHROPIC_API_KEY' >> "$CLAUDE_ENV_FILE"
echo 'unset VERCEL_TOKEN' >> "$CLAUDE_ENV_FILE"
```

Keep only:
```bash
echo 'unset GH_TOKEN' >> "$CLAUDE_ENV_FILE"
echo 'unset GITHUB_TOKEN' >> "$CLAUDE_ENV_FILE"
echo 'unset BROWSERLESS_TOKEN' >> "$CLAUDE_ENV_FILE"
echo 'unset CODESIGN_MCP_TOKEN' >> "$CLAUDE_ENV_FILE"
```

**File:** `.claude/scripts/security-hook.py`

Update `SENSITIVE_VARS`:
```python
SENSITIVE_VARS = [
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "BROWSERLESS_TOKEN",
    "CODESIGN_MCP_TOKEN",
    # Removed: OPENAI_API_KEY, ANTHROPIC_API_KEY, VERCEL_TOKEN
]
```

### Phase 4: Simplify .env.example

```bash
# =============================================================================
# Claude Code Web Environment
# =============================================================================

# GitHub token - ACTIONS ONLY (for workflow dispatch)
# Create at: github.com/settings/personal-access-tokens/new
# Permissions: Actions: Read and write (nothing else)
# GH_TOKEN=ghp_...

# Browserless token - Use a FREE account only
# Create at: browserless.io (free tier)
# GH_TOKEN=ghp_...
# BROWSERLESS_TOKEN=...

# =============================================================================
# GitHub Secrets (NOT here - add via repo Settings → Secrets → Actions)
# =============================================================================
# VERCEL_TOKEN     - vercel.com/account/tokens
# VERCEL_ORG_ID    - Found in Vercel project settings
```

### Phase 5: Update Documentation

**docs/cc-web-security.md** - Major rewrite:
- Remove all OPENAI_API_KEY, ANTHROPIC_API_KEY, VERCEL_TOKEN references
- Simplify to just GH_TOKEN (actions:write) and BROWSERLESS_TOKEN
- Update threat model for minimal token surface

**docs/vercel-deployment.md** - Rewrite for workflow-based deploys:
- Remove manual CLI commands with VERCEL_TOKEN
- Document `gh workflow run vercel-setup`
- Document `gh workflow run vercel-deploy`

**README.md** - Complete rewrite:
- New focus: "Rapid static HTML and webapp prototyping"
- Simplified setup (only 2 tokens in CC Web)
- Clear workflow: create → setup workflow → deploy workflow → browserless test

### Phase 6: Update pnpm-workspace.yaml

```yaml
packages:
  - 'packages/browserless'
  - 'projects/*'
```

### Phase 7: Clean Up

```bash
# Regenerate lockfile
pnpm install

# Update index.html (remove chat project links)
# Update any cross-references in docs
```

---

## New User Workflow

### First-Time Setup

1. **Create GH_TOKEN** (actions:write only, repo-scoped)
   - Add to CC Web environment

2. **Create BROWSERLESS_TOKEN** (free account)
   - Add to CC Web environment

3. **Add Vercel secrets to GitHub**
   - `VERCEL_TOKEN` - from vercel.com/account/tokens
   - `VERCEL_ORG_ID` - from Vercel dashboard

### Creating a New Project

```bash
# 1. CC Web creates project files
# (static HTML or webapp in projects/my-new-app/)

# 2. Trigger setup workflow
gh workflow run vercel-setup \
  -f project_name=my-new-app \
  -f project_path=projects/my-new-app

# 3. Check workflow summary for project ID

# 4. Add project ID to GitHub secrets (via UI or gh CLI)
# VERCEL_PROJECT_ID_MY_NEW_APP = prj_xxx

# 5. CC Web creates auto-deploy workflow
# .github/workflows/deploy-my-new-app.yml

# 6. Run Browserless e2e test
pnpm --filter @research/browserless screenshot https://my-new-app.vercel.app

# 7. CC Web opens PR
# User merges, auto-deploy triggers
```

---

## Files Changed Summary

| Action | Files |
|--------|-------|
| DELETE | `packages/openai-utils/` |
| DELETE | `projects/example-chat/` |
| DELETE | `projects/example-chat-web/` |
| DELETE | `projects/tanstack-chat/` |
| DELETE | `.github/workflows/deploy-example-chat-web.yml` |
| DELETE | `.github/workflows/deploy-tanstack-chat.yml` |
| CREATE | `.github/workflows/vercel-setup.yml` |
| CREATE | `.github/workflows/vercel-deploy.yml` |
| UPDATE | `.claude/scripts/setup-web-session.sh` |
| UPDATE | `.claude/scripts/security-hook.py` |
| UPDATE | `.env.example` |
| UPDATE | `docs/cc-web-security.md` |
| UPDATE | `docs/vercel-deployment.md` |
| UPDATE | `README.md` |
| UPDATE | `index.html` |
| UPDATE | `pnpm-lock.yaml` |

---

## Security Comparison

| Metric | Before | After |
|--------|--------|-------|
| Tokens in CC Web | 5+ | 2 |
| API keys exposed | OPENAI, ANTHROPIC, etc. | None |
| GH_TOKEN permissions | Broad | actions:write only |
| VERCEL_TOKEN location | CC Web + GitHub | GitHub only |
| Attack surface | High | Minimal |

---

## Rollback Plan

If issues arise:
1. Git revert to pre-refactor commit
2. Restore deleted directories from git history
3. Re-add tokens to CC Web environment

---

## Testing Checklist

- [ ] Create PAT with only `actions:write`
- [ ] Verify `gh workflow run` works
- [ ] Test vercel-setup workflow end-to-end
- [ ] Test vercel-deploy workflow
- [ ] Verify CC Web can still push/PR (native)
- [ ] Browserless screenshot works
- [ ] Docs build correctly
- [ ] index.html renders correctly
