# Chrome DevTools MCP - Browser Automation

Chrome DevTools MCP provides browser automation via Chrome's DevTools Protocol. Use this for SSH sessions, headless automation, CI/CD, or when you need deep debugging capabilities.

## When to Use

| Scenario | Use This? |
|----------|-----------|
| SSH into remote server | Yes |
| Running in VM (OrbStack, etc.) | Yes |
| CI/CD pipelines | Yes |
| Headless automation | Yes |
| Performance tracing | Yes |
| Local with logged-in sessions | No - use Claude-in-Chrome instead |

## Tools Available (26)

Key capabilities:
- Page navigation and interaction
- Screenshot capture
- Console log access
- Network request monitoring
- Performance tracing
- DOM inspection

## Setup

### 1. Install Chrome DevTools MCP

```bash
npm install -g chrome-devtools-mcp
```

Or use npx (no install needed).

### 2. Add to Claude Code Settings

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"]
    }
  }
}
```

### 3. Launch Chrome with Debug Port

Before using, start Chrome with remote debugging enabled:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

### 4. For SSH Sessions

If running Claude Code over SSH, tunnel the debug port:

```bash
ssh -L 9222:localhost:9222 user@remote-host
```

Then Chrome DevTools MCP connects to `localhost:9222`.

## Usage

Once Chrome is running with debug port:

```
Navigate to example.com and take a screenshot
```

```
Check the console for any errors on this page
```

```
Monitor network requests while I interact with the login form
```

```
Run a performance trace on page load
```

## CLI Options

| Option | Description |
|--------|-------------|
| `--browserUrl` | Connect to existing Chrome (e.g., `http://127.0.0.1:9222`) |
| `--headless` | Run in headless mode |
| `--isolated` | Temporary profile, auto-cleaned |
| `--viewport` | Set initial viewport size |
| `--no-usage-statistics` | Opt-out of telemetry |

## Comparison with Claude-in-Chrome

| Feature | Chrome DevTools MCP | Claude-in-Chrome |
|---------|---------------------|------------------|
| Setup | Chrome + debug port | Extension only |
| Works over SSH | Yes | No |
| Headless mode | Yes | No |
| Logged-in sessions | Manual setup | Automatic |
| Performance tracing | Yes | No |
| Token usage | ~19k | ~15k |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect" | Ensure Chrome is running with `--remote-debugging-port=9222` |
| "Port in use" | Close other Chrome instances or use different port |
| SSH tunnel fails | Check SSH connection and port forwarding |

## Source

- GitHub: [anthropics/chrome-devtools-mcp](https://github.com/anthropics/chrome-devtools-mcp)
- NPM: [chrome-devtools-mcp](https://www.npmjs.com/package/chrome-devtools-mcp)

---

[Back to README](../README.md) | [SETUP.md](../SETUP.md)
