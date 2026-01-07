# Codex Setup Skill

On-demand environment setup for OpenAI Codex. Install tools as needed during your session.

## When to Use

When running in a Codex environment and a required tool is missing, install it on-demand using the commands below.

## Detect Codex Environment

```bash
# Codex environments typically have these characteristics:
# - Linux-based container
# - npm/node pre-installed
# - sudo access available
```

## Install Tools On-Demand

### GitHub CLI (gh)

Required for: repository operations, workflow dispatch, PR management

```bash
# Check if installed
gh --version

# Install if missing
GH_VERSION="2.63.2"
curl -sL -o /tmp/gh.tar.gz "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz"
tar -xzf /tmp/gh.tar.gz -C /tmp
sudo cp /tmp/gh_${GH_VERSION}_linux_amd64/bin/gh /usr/local/bin/
rm -rf /tmp/gh.tar.gz /tmp/gh_${GH_VERSION}_linux_amd64

# Verify
gh --version
```

### Vercel CLI

Required for: direct deployments via [vercel skill](../vercel/)

```bash
# Check if installed
vercel --version

# Install if missing
npm install -g vercel@latest

# Verify
vercel --version
```

### pnpm

Required for: package management in this repo

```bash
# Check if installed
pnpm --version

# Install if missing
npm install -g pnpm@latest

# Verify
pnpm --version
```

## Environment Variables

Set these in your Codex environment settings (not via export in session):

| Variable | Required | Purpose |
|----------|----------|---------|
| `GH_TOKEN` | Yes | GitHub CLI operations, workflow dispatch |
| `BROWSERLESS_TOKEN` | Yes | Browser automation via [browserless](../../browserless/) |
| `VERCEL_TOKEN` | No | Direct Vercel deploys (optional) |

## Network

Codex environments generally have fewer network restrictions than Claude Code Web. Standard `fetch` typically works without proxy configuration.

## Workflow

1. Start your task
2. When a command fails with "command not found", install it using the commands above
3. Continue with your task

This on-demand approach keeps environments lean and avoids installing unused tools.

## See Also

- [docs/cloud-environments.md](../../docs/cloud-environments.md) - All cloud environment setup
- [skills/vercel/SKILL.md](../vercel/SKILL.md) - Vercel deployment skill
- [browserless/README.md](../../browserless/README.md) - Browser automation package
