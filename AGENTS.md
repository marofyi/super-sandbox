# AGENTS.md

README: @README.md

Instructions for AI coding agents working in this repository.

## Agent Skills

This repository uses the [Agent Skills](https://agentskills.io) open standard for cross-platform agent capabilities. Skills are discovered from `.skills/` and provide specialized knowledge for common tasks.

| Skill | Description | Tools |
|-------|-------------|-------|
| [browserless](.skills/browserless/SKILL.md) | Browser automation using Browserless BrowserQL. Use for web scraping, UI testing, screenshot capture, form interaction, content extraction, and any task requiring browser control from sandboxed environments like Claude Code Web. | Read Bash Glob |
| [vercel-deploy](.skills/vercel-deploy/SKILL.md) | Deploy web projects to Vercel. Use when deploying projects, setting up new Vercel projects, configuring environment variables, or troubleshooting deployment issues. | Read Bash Glob |

Skills work with Claude Code, Codex, Cursor, VS Code Copilot, and other agents supporting the Agent Skills spec.

## Workflow: Plan → Build → Test

**This project enforces a strict human-in-the-loop workflow.** Do not jump straight to implementation.

### Exception: Automated CI/CD Workflows

**When running in GitHub Actions or other automated CI/CD pipelines:**
- Skip the Plan phase entirely
- Execute tasks directly without asking for confirmation
- Do not output "Shall I proceed?" or similar approval requests
- Complete the task autonomously and exit

This exception applies when the prompt explicitly instructs you to execute without confirmation.

### Automation

- `.github/workflows/update-docs.yml` keeps docs current on pull requests (replaces the old README-only workflow).
- Deployment workflows live in `.github/workflows/deploy-<project>.yml` (per web project).

### Phase 1: Plan

Before writing any code:

1. **Research** - Explore relevant files and understand existing patterns
2. **Propose** - Present a clear, numbered implementation plan
3. **Wait** - Do not proceed until the human approves the plan

Example plan format:
```
## Proposed Plan

1. Create new file `packages/foo/src/bar.ts` with X functionality
2. Update `packages/foo/src/index.ts` to export the new module
3. Add tests in `packages/foo/src/bar.test.ts`

Shall I proceed?
```

### Phase 2: Build

After receiving approval:

1. Implement changes in small, reviewable increments
2. Follow existing code patterns in the codebase
3. Keep changes focused - one logical change at a time

### Phase 3: Test

Before any commit:

1. Run type checking: `pnpm check`
2. Build affected packages: `pnpm b @research/<package-name> build`
3. Verify the build succeeds with no errors

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install all dependencies |
| `pnpm check` | Type-check all packages (must pass before commits) |
| `pnpm b @research/<pkg> build` | Build a specific package |
| `pnpm --filter @research/<pkg> start` | Run a project |
| `pnpm --filter @research/tanstack-chat test:visual <url>` | Capture responsive screenshots (needs `BROWSERLESS_TOKEN`) |

## Project Structure

```
research/
├── .skills/            # Agent Skills (cross-platform)
│   ├── browserless/    # Browser automation (scraping, screenshots, forms)
│   └── vercel-deploy/  # Vercel deployment procedures
├── packages/           # Shared utilities (publishable)
│   ├── browserless/    # BrowserQL client (HTTP-only browser automation)
│   └── openai-utils/   # OpenAI API wrapper
├── projects/           # Research projects (use packages)
│   ├── example-chat/   # CLI demo project
│   ├── example-chat-web/ # Web demo (Vercel)
│   └── tanstack-chat/  # TanStack Start demo (Vercel)
├── docs/               # Documentation
│   ├── cc-web-browser-automation.md  # HTTP-only browser automation pattern
│   ├── cc-web-network-guide.md       # Proxy-aware HTTP requests in CC Web
│   ├── learnings-log.md              # Chronological gotchas/insights
│   └── vercel-deployment.md          # Vercel deployment guide
├── .env                # API keys (never commit)
└── .env.example        # Template for environment setup
```

## Environment Variables

### Required

| Variable | Description | Get it from |
|----------|-------------|-------------|
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys |

### Optional - Additional Model Providers

| Variable | Description | When needed |
|----------|-------------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key | TanStack Chat multi-provider demo |
| `GEMINI_API_KEY` | Google Gemini API key | TanStack Chat multi-provider demo |

### Required (for browser automation/visual QA)

| Variable | Description | When needed |
|----------|-------------|-------------|
| `BROWSERLESS_TOKEN` | Browserless BrowserQL auth token | Running visual QA or `@research/browserless` scripts |

### Optional (for browser automation)

| Variable | Description | When needed |
|----------|-------------|-------------|
| `BROWSERLESS_URL` | Custom Browserless endpoint | Using a non-default Browserless host |

### Optional - Deployment and CI

| Variable | Description | When needed |
|----------|-------------|-------------|
| `VERCEL_TOKEN` | Vercel API/CLI auth | Deploying to Vercel |
| `VERCEL_ORG_ID` | Vercel organization/team ID | Vercel CLI and GitHub Actions |
| `VERCEL_PROJECT_ID_<NAME>` | Per-project secret | GitHub Actions deploy workflows |
| `GH_TOKEN` | GitHub personal access token | Headless `gh` CLI usage |

### Setup by Environment

#### Local Mac

```bash
# Create .env from template
cp .env.example .env

# Edit and add your keys
nano .env
```

The `.env` file is gitignored and persists locally.

#### Claude Code Web/Cloud

The web environment is **ephemeral**—files outside the repo reset each session.

**Recommended:** Add secrets via Claude Code settings (they persist across sessions and inject automatically).

**Alternative:** Export manually each session:
```bash
export OPENAI_API_KEY=sk-proj-...
```

| Environment | `.env` persists? | Best approach |
|-------------|------------------|---------------|
| Local Mac | ✅ Yes | Use `.env` file |
| Claude Code Web | ❌ No | Use Claude Code secrets |

## Boundaries

### Always Do

- Run `pnpm check` before committing
- Follow existing TypeScript patterns (strict mode enabled)
- Use existing utilities from `packages/` when available
- Keep commits atomic and focused

### Ask First

- Adding new dependencies
- Creating new packages or projects
- Modifying shared package APIs
- Changes affecting multiple packages
- Architectural decisions

### Never Do

- Commit `.env` or any file containing secrets
- Skip the plan phase for non-trivial changes
- Push directly to main without PR review
- Modify `node_modules/` or `dist/` directories
- Make breaking API changes without discussion

## Code Style

```typescript
// Use explicit types for function signatures
export async function chat(
  prompt: string,
  options?: ChatOptions
): Promise<ChatResponse> {
  // ...
}

// Prefer async/await over raw promises
const result = await ask('question');

// Use named exports, not default exports
export { ask, chat, chatStream };
```

## Git Workflow

1. Work on feature branches, never directly on main
2. Write clear, descriptive commit messages
3. Ensure `pnpm check` passes before committing
4. Create PRs for human review before merging

## Proof of Completion

A task is only complete when:

- [ ] Type checking passes (`pnpm check`)
- [ ] Build succeeds for affected packages
- [ ] Changes are committed with a clear message
- [ ] Human has reviewed and approved (for PRs)

## Claude Code for Web Sessions

This project supports Claude Code for Web, which runs in an ephemeral sandbox environment.

### Automatic Setup

A SessionStart hook (`.claude/settings.json`) automatically runs `.claude/scripts/setup-web-session.sh` on new web sessions. This installs:

- **GitHub CLI (`gh`)** - Required for PR operations

### Environment Detection

Scripts can detect web sessions via:

```bash
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  # Running in web sandbox
fi
```

### Extending the Setup

To add more tools to web sessions, edit `.claude/scripts/setup-web-session.sh`:

```bash
# Example: Add another tool
if ! command -v mytool &> /dev/null; then
  echo "Installing mytool..."
  # installation commands
fi
```

### Limitations

- Environment is ephemeral (tools reinstalled each session)
- Write access limited to project directory
- Some network domains require approval

## Deployment

Web projects in `projects/` are deployed to Vercel via CLI-first workflows. See [docs/vercel-deployment.md](docs/vercel-deployment.md) for the complete guide.

### Quick Reference

**Create/link a new project** (CLI is more reliable than API):
```bash
rm -rf .vercel
pnpm exec vercel project add <name> --token "$VERCEL_TOKEN"
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel link --project <name> --yes --token "$VERCEL_TOKEN"
```

**Add env vars**:
```bash
VERCEL_ORG_ID= VERCEL_PROJECT_ID= pnpm exec vercel env add OPENAI_API_KEY production --token "$VERCEL_TOKEN" <<< "$OPENAI_API_KEY"
```

**Deploy** (from monorepo root):
```bash
pnpm exec vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

**Add GitHub Actions**:
- Add repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_<NAME>` (use `-R owner/repo` in CC Web since git remotes point to a proxy).
- Workflows live at `.github/workflows/deploy-<name>.yml`.

### Key Points

- Each web project gets its own Vercel project and workflow
- Unset `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` while running CLI commands to avoid conflicts
- Build runs from monorepo root; `sourceFilesOutsideRootDirectory=true` is required (CLI sets it)
- API-based setup is unreliable; prefer CLI commands above

### Current Deployments

| Project | URL | Project ID |
|---------|-----|------------|
| example-chat-web | https://example-chat-web-marofyi.vercel.app | `prj_3ten4pMxczOKsya7GVc3Dh6VhZTr` |
| tanstack-chat | https://tanstack-chat.vercel.app | `prj_ugAj68LssRkhASeqoqqZ4GihVwQI` |
