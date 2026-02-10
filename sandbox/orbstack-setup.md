# OrbStack Sandbox Setup

Run Claude Code in an isolated Linux VM while maintaining browser automation on your host.

## Why Sandbox?

- **Isolation**: Claude Code can't access your host filesystem
- **Fresh environment**: No inherited credentials or SSH keys
- **Safe autonomy**: Run with `--dangerously-skip-permissions` safely
- **Reproducibility**: Consistent environment across sessions

## Prerequisites

- macOS with Apple Silicon or Intel
- [OrbStack](https://orbstack.dev/) installed
- Claude Code CLI

## Setup

### 1. Install OrbStack

```bash
brew install orbstack
```

Or download from [orbstack.dev](https://orbstack.dev/).

### 2. Create Ubuntu VM

```bash
orb create ubuntu sandbox
```

### 3. Install Claude Code in VM

```bash
orb run sandbox -- bash -c 'curl -fsSL https://claude.ai/install.sh | bash'
```

### 4. Authenticate Claude in VM

```bash
orb run sandbox -- claude auth login
```

Follow the prompts to authenticate.

### 5. Create Shell Alias

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias cc-sandbox="orb run sandbox -- claude --dangerously-skip-permissions"
```

## Usage

### Basic Usage

```bash
cc-sandbox
```

## Browser Automation in Sandbox

For browser automation from within the sandbox, use Chrome DevTools MCP:

### 1. Start Chrome with Debug Port (on host)

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

### 2. Configure Chrome DevTools MCP (in sandbox)

The VM can access host services via `host.internal`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--browserUrl", "http://host.internal:9222"]
    }
  }
}
```

## File Sharing

OrbStack automatically shares your home directory. To work on a project:

```bash
orb run sandbox -- claude --dangerously-skip-permissions ~/projects/myapp
```

Or mount specific directories:

```bash
orb config set sandbox volumes "$HOME/projects:/projects"
orb run sandbox -- claude /projects/myapp
```

## Resource Configuration

Adjust VM resources:

```bash
# Set CPU and memory
orb config set sandbox cpus 4
orb config set sandbox memory 8GB
```

## Alternative: Docker

If you prefer Docker over OrbStack:

```bash
# Create container with Claude Code
docker run -it --name claude-sandbox ubuntu:24.04

# Inside container
curl -fsSL https://claude.ai/install.sh | bash
claude auth login
```

Then create an alias:

```bash
alias cc-docker="docker exec -it claude-sandbox claude --dangerously-skip-permissions"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "VM not found" | Run `orb create ubuntu sandbox` |
| "Permission denied" | Check OrbStack is running |
| "Can't connect to host" | Use `host.internal` instead of `localhost` |
| Slow performance | Increase CPU/memory allocation |

## Comparison: OrbStack vs Docker

| Feature | OrbStack | Docker |
|---------|----------|--------|
| Setup complexity | Low | Medium |
| macOS integration | Excellent | Good |
| Performance | Native-like | Good |
| Resource usage | Low | Medium |
| GUI apps support | Yes | Limited |

---

[Back to README](../README.md) | [SETUP.md](../SETUP.md)
