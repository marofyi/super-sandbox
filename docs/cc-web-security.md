# Claude Code Web Security Model

Security considerations for running Claude Code in web sessions with minimal token exposure.

## Token Architecture

This monorepo uses a **minimal token surface** design:

| Token | Location | Scope | Purpose |
|-------|----------|-------|---------|
| `GH_TOKEN` | CC Web env | `actions:write` only | Dispatch workflows via `gh workflow run` |
| `BROWSERLESS_TOKEN` | CC Web env | Full (free account) | E2E testing screenshots |
| `VERCEL_TOKEN` | GitHub Secrets | Team-scoped | Deployments (via workflows) |

**No API keys in CC Web.** Vercel deployments are handled by GitHub Actions workflows.

## Threat Model

### Attack Sources

Prompt injection can come from:
- **GitHub Issues/PRs** - Malicious content being analyzed
- **Web Content** - Crafted content on fetched pages
- **Repository Files** - Instructions in code, markdown, or config
- **Commit Messages** - Crafted commit messages or branch names

### Attack Vectors

An attacker could trick the AI into running:
- `echo $GH_TOKEN` - Direct token access
- `env` / `printenv` - Environment dumps
- `gh auth token` - GitHub CLI token reveal
- `cat ~/.config/gh/hosts.yml` - Reading stored credentials

## Defense Layers

### Layer 1: Minimal Token Surface (Architecture)

By design, only 2 tokens exist in CC Web environment:

1. **`GH_TOKEN`** - Only has `actions:write` permission
   - Can only dispatch workflows
   - Cannot push code, create PRs, or read issues
   - Repository-scoped (single repo only)

2. **`BROWSERLESS_TOKEN`** - Dedicated free account
   - No sensitive data in account
   - Separate from production accounts

**Vercel deployments** use `VERCEL_TOKEN` stored in GitHub Secrets, accessed only by workflows.

### Layer 2: Token Hiding via CLAUDE_ENV_FILE

The SessionStart hook (`.claude/scripts/setup-web-session.sh`) removes tokens from the environment:

1. **Writes GH_TOKEN to gh config file** (`~/.config/gh/hosts.yml`)
2. **Unsets tokens** via `CLAUDE_ENV_FILE` mechanism
3. **gh CLI continues to work** using config file authentication

After setup, Bash commands **do not have access to tokens** in their environment.

### Layer 3: PreToolUse Hook (Defense in Depth)

A Python hook (`.claude/scripts/security-hook.py`) blocks dangerous patterns:

| Category | Blocked Patterns |
|----------|------------------|
| Direct access | `$GH_TOKEN`, `$BROWSERLESS_TOKEN` |
| Generic patterns | `$*_TOKEN`, `$*_KEY`, `$*_SECRET` |
| gh CLI reveal | `gh auth token`, `gh auth status --show-token` |
| Environment dumps | `env`, `printenv`, `set`, `export`, `declare -p` |
| Procfs access | `/proc/*/environ` |
| gh config readers | `cat`, `less`, `head`, etc. on `~/.config/gh/` |
| Language env access | `python os.environ`, `node process.env`, etc. |

## GH_TOKEN: Actions-Only Scope

### Why Actions Only?

CC Web handles git operations **natively** (push, PRs, issues). The only thing requiring `gh` CLI is workflow dispatch:

```bash
gh workflow run vercel-setup -f project_name=my-app
gh workflow run vercel-deploy -f project_name=my-app
```

### Creating the Token

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Token name**: `Claude Code Web - actions only`
3. **Expiration**: 30 days
4. **Repository access**: "Only select repositories" → your repo
5. **Permissions**: Only `Actions: Read and write`

### Blast Radius if Leaked

With actions-only scope, an attacker can:
- ✅ Trigger workflow runs (cost risk)
- ❌ Cannot push code
- ❌ Cannot create PRs
- ❌ Cannot read issues
- ❌ Cannot access secrets
- ❌ Cannot modify repository

## BROWSERLESS_TOKEN: Account Isolation

Browserless has no token scoping. Mitigation:

1. **Use a dedicated FREE account** - No billing, no sensitive data
2. **Token hiding** - Unset via CLAUDE_ENV_FILE
3. **Hook blocking** - Direct access blocked

## VERCEL_TOKEN: GitHub Secrets Only

Vercel token is **NOT in CC Web environment**. It exists only in GitHub Secrets.

Deployments are triggered by:
```bash
gh workflow run vercel-setup -f project_name=my-app
```

The workflow uses `${{ secrets.VERCEL_TOKEN }}` - never exposed to CC Web.

## What's NOT Protected

The security hook cannot prevent all attacks:

1. **Novel obfuscation** - Creative encoding may bypass patterns
2. **Multi-step attacks** - Building payloads across commands
3. **Side-channel attacks** - Timing or error-based leakage

This is why **minimal token scope** is the primary defense.

## Testing the Security Hook

These should be **BLOCKED**:

```bash
echo $GH_TOKEN
echo $BROWSERLESS_TOKEN
env
printenv
gh auth token
cat ~/.config/gh/hosts.yml
```

These should be **ALLOWED**:

```bash
git status
gh workflow run vercel-setup
gh workflow list
export FOO=bar
```

## Files

| File | Purpose |
|------|---------|
| `.claude/scripts/security-hook.py` | PreToolUse hook blocking dangerous commands |
| `.claude/scripts/setup-web-session.sh` | Session setup, token hiding |
| `.claude/settings.json` | Hook configuration |

## See Also

- [cc-web.md](./cc-web.md) - General Claude Code Web guide
- [vercel-deployment.md](./vercel-deployment.md) - Workflow-based deployments
- [AGENTS.md](../AGENTS.md) - Agent behavior rules

### External Documentation

- [GitHub Fine-grained PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens)
- [Browserless API](https://docs.browserless.io/overview/connection-urls)
