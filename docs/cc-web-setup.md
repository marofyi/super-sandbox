# Claude Code Web Setup

This project supports Claude Code for Web, which runs in an ephemeral sandbox environment.

## Automatic Setup

A SessionStart hook (`.claude/settings.json`) automatically runs `.claude/scripts/setup-web-session.sh` on new web sessions. This installs:

- **GitHub CLI (`gh`)** - Required for PR operations

## Environment Detection

Scripts can detect web sessions via:

```bash
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  # Running in web sandbox
fi
```

## Extending the Setup

To add more tools to web sessions, edit `.claude/scripts/setup-web-session.sh`:

```bash
# Example: Add another tool
if ! command -v mytool &> /dev/null; then
  echo "Installing mytool..."
  # installation commands
fi
```

## Limitations

- Environment is ephemeral (tools reinstalled each session)
- Write access limited to project directory
- Some network domains require approval

## See Also

- [CC Web Network Guide](./cc-web-network-guide.md) - Proxy/DNS behavior and fetch patterns
- [CC Web Browser Automation](./cc-web-browser-automation.md) - HTTP-only browser automation
