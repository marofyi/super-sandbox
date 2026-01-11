# Cloud Environments Guide

Running Super Sandbox in sandboxed cloud AI environments.

## Supported Environments

| Environment | Setup Method | Config Location |
|-------------|--------------|-----------------|
| **Claude Code Web** | Auto (SessionStart hook) | `.claude/settings.json` |
| **OpenAI Codex** | On-demand (skill) | [skills/codex-setup/](../skills/codex-setup/) |
| **Gemini CLI Agent Mode** | Native AGENTS.md support | No setup needed |

---

## Claude Code Web

### Automatic Session Setup

A SessionStart hook (`.claude/settings.json`) runs `.claude/scripts/setup-web-session.sh` on new web sessions, installing:

- **GitHub CLI (`gh`)** — Required for workflow dispatch
- **Vercel CLI** — Required for direct deployments
- **pnpm** — Package manager

### Environment Detection

```bash
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  # Running in web sandbox
fi
```

### Token Architecture

| Token | Location | Scope | Purpose |
|-------|----------|-------|---------|
| `GH_TOKEN` | CC Web env | Fine-grained (Actions: Read & Write) | Workflow dispatch |
| `BROWSERLESS_TOKEN` | CC Web env | Full (free account) | Browser automation |
| `VERCEL_TOKEN` | CC Web env | Team-scoped | Deployments and hosting |

### Creating GH_TOKEN

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Token name**: `Claude Code Web`
3. **Expiration**: 30 days (or longer)
4. **Repository access**: Select your Super Sandbox repo
5. **Permissions**: Actions → Read & Write

### Creating VERCEL_TOKEN

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. **Name**: `Claude Code Web`
4. **Scope**: Select your team/account
5. **Expiration**: 30 days (or longer)

### Network Constraints

CC Web routes traffic through a proxy. Node.js native `fetch` fails because it ignores proxy settings.

**Solution:** Use `undici` with `ProxyAgent`:

```typescript
import { ProxyAgent, fetch as undiciFetch } from "undici";

const proxyUrl = process.env.HTTPS_PROXY;
if (proxyUrl) {
  const agent = new ProxyAgent(proxyUrl);
  // Use agent as dispatcher in fetch calls
}
```

The `@super-sandbox/browserless` package handles this automatically.

### Browser Automation

CC Web blocks WebSocket connections. Use Browserless BrowserQL (HTTP-based) instead of Playwright/Puppeteer.

```typescript
import { goto, screenshot } from '@super-sandbox/browserless';

await goto('https://example.com');
const img = await screenshot();
```

---

## OpenAI Codex

### Setup

Install tools on-demand as needed during your session. See [skills/codex-setup/SKILL.md](../skills/codex-setup/SKILL.md) for installation commands.

Available tools:
- GitHub CLI (`gh`) — for repository operations
- Vercel CLI — for direct deployments
- pnpm — for package management

### Environment Variables

Set these in your Codex environment settings:

| Variable | Purpose |
|----------|---------|
| `GH_TOKEN` | GitHub Actions (fine-grained, Actions: Read & Write) |
| `BROWSERLESS_TOKEN` | Browser automation |
| `VERCEL_TOKEN` | Deployments and hosting |

### Network

Codex environments generally have fewer network restrictions than CC Web. Standard `fetch` typically works without proxy configuration.

---

## Gemini CLI Agent Mode

### Setup

Gemini CLI natively reads `AGENTS.md` files. No additional setup required.

```bash
# Install Gemini CLI
npm install -g @anthropic-ai/gemini-cli

# Run in agent mode
gemini agent
```

### Environment Variables

Set the same tokens as other environments:

```bash
export GH_TOKEN="your-token"
export BROWSERLESS_TOKEN="your-token"
export VERCEL_TOKEN="your-token"
```

### Workflow

Gemini CLI reads:
1. `AGENTS.md` for agent behavior instructions
2. `CLAUDE.md` (which points to `AGENTS.md`)
3. Project structure and conventions

---

## Common Setup

### Required Tokens

| Token | Get It From | Purpose |
|-------|-------------|---------|
| `GH_TOKEN` | [Fine-grained token](https://github.com/settings/personal-access-tokens/new) | GitHub Actions (Actions: Read & Write) |
| `BROWSERLESS_TOKEN` | [browserless.io](https://browserless.io) (free tier) | Browser automation |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) | Deployments and hosting |

### Security Notes

- Use minimal token scopes
- Avoid printing or logging tokens
- Set appropriate expiration dates
- Tokens stay in environment—don't commit them

### Limitations by Environment

| Limitation | CC Web | Codex | Gemini CLI |
|------------|--------|-------|------------|
| Ephemeral environment | Yes | Configurable | No |
| WebSocket blocked | Yes | No | No |
| Proxy required | Yes | Sometimes | No |
| Native AGENTS.md | No | No | Yes |

---

## See Also

- [README.md](../README.md) — Project overview
- [docs/browserless.md](./browserless.md) — Browser automation guide
- [skills/vercel/SKILL.md](../skills/vercel/SKILL.md) — Vercel deployment skill
- [CHANGELOG.md](../CHANGELOG.md) — Recent changes and discoveries
