# Claude-in-Chrome - Browser Automation

Claude-in-Chrome is Anthropic's official browser extension that connects Claude Code to your Chrome browser for automation tasks.

## When to Use

| Scenario | Use This? |
|----------|-----------|
| Local development | Yes |
| Testing with logged-in accounts | Yes |
| Visual verification | Yes |
| GIF recording of workflows | Yes |
| SSH/remote sessions | No - use Chrome DevTools MCP |
| CI/CD pipelines | No - use Chrome DevTools MCP |

## Requirements

- Google Chrome (not Brave, Arc, or other Chromium browsers)
- Claude Code v2.0.73+
- Direct Anthropic plan (Pro, Max, Team, or Enterprise)
- **Not available** through Bedrock, Vertex AI, or other third-party providers

## Setup

### 1. Install the Extension

1. Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
2. Click "Add to Chrome"
3. Sign in with your Claude account
4. Pin the extension (click puzzle icon, then thumbtack)

### 2. Enable in Claude Code

**Option A: Per-session**
```bash
claude --chrome
```

**Option B: Enable within a session**
```
/chrome
```

**Option C: Enable by default**
1. Run `/chrome` in Claude Code
2. Select "Enabled by default"

## Tools Available (16)

- Navigate pages (URLs, back/forward)
- Click, type, scroll
- Read page content and DOM
- Access console logs
- Monitor network requests
- Record GIFs of interactions
- Multi-tab management

## Usage Examples

### Basic Navigation

```
Go to github.com and search for "claude code"
```

### Form Testing

```
Navigate to localhost:3000/login, try submitting with invalid email,
and check if the error message appears correctly
```

### Visual Verification

```
Open the dashboard page and compare the layout to the Figma mockup
```

### GIF Recording

```
Record a GIF showing the complete checkout flow from cart to confirmation
```

### Console Debugging

```
Check the browser console for any errors on this page
```

## Comparison with Chrome DevTools MCP

| Feature | Claude-in-Chrome | Chrome DevTools MCP |
|---------|------------------|---------------------|
| Setup | Extension only | Chrome + debug port |
| Logged-in sessions | Automatic | Manual |
| Works over SSH | No | Yes |
| Headless mode | No | Yes |
| Token usage | ~15.4k | ~19k |
| Performance tracing | No | Yes |

## Best Practice: Use Both

Install both for comprehensive coverage:

- **Claude-in-Chrome** for local development with your logged-in browser
- **Chrome DevTools MCP** for SSH sessions, CI/CD, and performance analysis

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Extension not connected" | Restart Chrome and Claude Code, run `/chrome` |
| "Extension not detected" | Install/enable in `chrome://extensions` |
| "No tab available" | Ask Claude to create a new tab |
| "Receiving end does not exist" | Run `/chrome` and select "Reconnect" |

### Windows-Specific

- **Named pipe conflicts**: Restart Claude Code, close other sessions
- **Native messaging errors**: Reinstall Claude Code

## Native Messaging Host

First-time setup installs a config file:

| OS | Location |
|----|----------|
| macOS | `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.anthropic.claude_code_browser_extension.json` |
| Linux | `~/.config/google-chrome/NativeMessagingHosts/...` |
| Windows | Registry: `HKCU\Software\Google\Chrome\NativeMessagingHosts\` |

## Limitations

- Chrome only (no Brave, Arc)
- WSL not supported
- Beta status (uses your actual browser session)
- Requires direct Anthropic plan

## Source

- [Official Documentation](https://code.claude.com/docs/en/chrome)
- [Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)

---

[Back to README](../README.md) | [SETUP.md](../SETUP.md)
