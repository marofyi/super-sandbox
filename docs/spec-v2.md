# Super-Sandbox Specification v2.0

> Sandboxed Claude Code execution with native browser automation.

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Architecture](#architecture)
4. [CLI Interface](#cli-interface)
5. [Project Management](#project-management)
6. [VM Management](#vm-management)
7. [Browser Bridge](#browser-bridge)
8. [Installation](#installation)
9. [Configuration](#configuration)
10. [Security Model](#security-model)
11. [Error Handling](#error-handling)
12. [Migration from v1](#migration-from-v1)

---

## Overview

Super-Sandbox is a macOS CLI tool that runs Claude Code in an isolated Linux virtual machine while maintaining access to the host's Chrome browser for web automation.

### The Problem

Claude Code running directly on macOS has full access to the host system. Users wanting to give Claude Code more autonomy face a tradeoff: either restrict what Claude can do, or accept risk to their system.

Browser automation compounds this: running a browser inside a VM means no access to existing login sessions, cookies, or extensions.

### The Solution

Super-Sandbox splits execution:

| Component | Location | Why |
|-----------|----------|-----|
| Claude Code | Linux VM | Sandboxed, can't damage host |
| Project files | Host (mounted) | Accessible to both, survives VM reset |
| Browser automation | Host Chrome | Uses existing sessions, cookies, extensions |
| gh/vercel CLI | Linux VM | Operates on repos, deploys from sandbox |

### Value Proposition

1. **For cautious developers**: Run Claude Code with full autonomy without risking your system
2. **For browser automation**: Use your real Chrome with real logins, controlled from sandboxed Claude Code
3. **For CC Web users**: Create properly-configured project repos that work seamlessly in Claude Code Web

---

## Design Principles

### 1. Invisible by Default

Using Super-Sandbox should feel identical to using Claude Code directly. The VM layer disappears. Users type `ss my-project` and they're in Claude Code—no awareness of the VM required.

### 2. Sandboxed Execution, Native Browsing

Code runs in complete isolation. A malicious or buggy command cannot damage the host. But browser automation uses your real Chrome with your real login sessions—no fake environments or separate browser profiles.

### 3. Persistent State

One VM, persistent across sessions. Login to Claude Code once. Install packages once. Configure tools once. It all persists.

### 4. Parallel-Friendly

Multiple terminals. Multiple projects. Same VM. No conflicts. Users can have three Claude Code sessions running simultaneously on different projects.

### 5. Fresh Environment

The VM is a clean slate. No SSH keys from host. No inherited credentials. Users explicitly authenticate tools (gh, vercel) inside the sandbox.

### 6. Minimal Scaffolding

New projects are minimal: `.git/`, `AGENTS.md`, `README.md`. No framework lock-in. No dependency bloat. Instructions live in AGENTS.md, not scattered across skill folders.

---

## Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│  macOS Host                                                              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Google Chrome + Claude in Chrome Extension                        │  │
│  │                                                                    │  │
│  │  • Runs natively on macOS                                          │  │
│  │  • Has access to all logged-in sessions                            │  │
│  │  • Controlled via Native Messaging API                             │  │
│  └─────────────────────────┬──────────────────────────────────────────┘  │
│                            │                                             │
│                            │ Native Messaging (stdio)                    │
│                            │                                             │
│  ┌─────────────────────────▼──────────────────────────────────────────┐  │
│  │  ss-bridge                                                         │  │
│  │                                                                    │  │
│  │  • Registered as Chrome Native Messaging host                      │  │
│  │  • Serializes concurrent requests from VM                          │  │
│  │  • Intercepts URL opens for OAuth flows                            │  │
│  └─────────────────────────┬──────────────────────────────────────────┘  │
│                            │                                             │
│                            │ Unix socket                                 │
│                            │ /tmp/ss-browser-bridge.sock                 │
│                            │                                             │
│  ┌─────────────────────────┴──────────────────────────────────────────┐  │
│  │  ss CLI                                                            │  │
│  │                                                                    │  │
│  │  • Manages VM lifecycle via Lume                                   │  │
│  │  • Creates and manages projects                                    │  │
│  │  • Handles SSH connections with PTY passthrough                    │  │
│  │  • Auto-updates on launch                                          │  │
│  └─────────────────────────┬──────────────────────────────────────────┘  │
│                            │                                             │
│                            │ SSH (PTY passthrough)                       │
│                            │                                             │
│  ┌─────────────────────────┼──────────────────────────────────────────┐  │
│  │  ~/super-sandbox/       │                                          │  │
│  │      projects/          │  ◄── virtio-fs mount ──┐                 │  │
│  │          my-app/        │                        │                 │  │
│  │          other-proj/    │                        │                 │  │
│  │      config.yaml        │                        │                 │  │
│  └─────────────────────────┼────────────────────────┼─────────────────┘  │
│                            │                        │                    │
└────────────────────────────┼────────────────────────┼────────────────────┘
                             │                        │
┌────────────────────────────▼────────────────────────▼────────────────────┐
│  Linux VM (Apple Virtualization Framework via Lume)                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  /home/sandbox/                                                    │  │
│  │      projects/             ← mounted from host                     │  │
│  │      .claude/              ← Claude Code credentials (persistent)  │  │
│  │      .config/gh/           ← GitHub CLI auth (persistent)          │  │
│  │      .config/vercel/       ← Vercel CLI auth (persistent)          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Claude Code Sessions (parallel)                                   │  │
│  │                                                                    │  │
│  │  Terminal 1 ──► claude (PID 1001) ──► ~/projects/my-app            │  │
│  │  Terminal 2 ──► claude (PID 1002) ──► ~/projects/my-app            │  │
│  │  Terminal 3 ──► claude (PID 1003) ──► ~/projects/other-proj        │  │
│  │                         │                                          │  │
│  │                         ▼                                          │  │
│  │                  Browser bridge client                             │  │
│  │                  (connects to host socket)                         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Pre-installed: git, node, python, gh, vercel, build-essential          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### ss CLI (`/usr/local/bin/ss`)

- Project lifecycle: create, list, delete
- VM lifecycle: start, stop, reset, status
- SSH session management with PTY passthrough
- Configuration management
- Auto-update on launch

#### ss-bridge (`/usr/local/bin/ss-bridge`)

- Registered as Chrome Native Messaging host
- Listens on Unix socket for VM connections
- Forwards browser commands to Claude in Chrome extension
- Intercepts and handles URL opens (for OAuth)
- Serializes concurrent requests

#### VM Image

- Ubuntu 24.04 ARM64
- Pre-installed tools: Claude Code, gh, vercel, node (LTS), python3, git, build-essential
- SSH server for terminal access
- Browser bridge client for host communication
- Passwordless sudo for sandbox user

#### Lume

- Third-party VM runtime using Apple Virtualization Framework
- Provides: VM creation, start/stop, virtio-fs mounts, resource allocation
- Super-Sandbox depends on Lume but does not modify it

---

## CLI Interface

### Command Structure

```
ss [command] [arguments] [flags]
```

### Commands

#### `ss` (no arguments)

Opens interactive menu for project selection.

```
╭───────────────────────────────────────────────────────────╮
│  Super-Sandbox                                            │
│                                                           │
│  Projects:                                                │
│    1. my-app                         (last: 2h ago)       │
│    2. client-website                 (last: 1d ago)       │
│    3. experiments                    (last: 3d ago)       │
│                                                           │
│  ──────────────────────────────────────────────────────── │
│                                                           │
│  [n] New project                                          │
│  [s] Settings                                             │
│  [q] Quit                                                 │
│                                                           │
╰───────────────────────────────────────────────────────────╯

Select [1-3/n/s/q]:
```

#### `ss <project>`

Connects to VM and starts Claude Code in the specified project directory.

```bash
$ ss my-app
Connecting...

  ╭───────────────────────────────────────────────────────╮
  │  Super-Sandbox · my-app                               │
  ╰───────────────────────────────────────────────────────╯

>
```

If VM is not running, starts it automatically. Connection should complete in <2 seconds when VM is already running.

#### `ss <project> -t, --terminal`

Opens terminal in project directory without starting Claude Code.

```bash
$ ss my-app -t
sandbox@super-sandbox:~/projects/my-app$
```

Useful for manual operations, debugging, or running specific commands.

#### `ss new <name>`

Creates a new project with minimal scaffold.

```bash
$ ss new my-api
Created: ~/super-sandbox/projects/my-api

Files:
  AGENTS.md    - Agent instructions
  README.md    - Project readme

$ ss my-api
```

See [Project Management](#project-management) for scaffold details.

#### `ss new <name> --github`

Creates project and GitHub repository in one step.

```bash
$ ss new my-api --github
Created: ~/super-sandbox/projects/my-api
GitHub: https://github.com/username/my-api

Ready for Claude Code Web or local sandbox.
```

Requires gh CLI to be authenticated in VM.

#### `ss list`

Lists all projects with metadata.

```bash
$ ss list
NAME              LAST ACCESSED    SIZE
my-app            2 hours ago      145 MB
client-website    1 day ago        89 MB
experiments       3 days ago       12 MB
```

#### `ss delete <name>`

Deletes a project with confirmation.

```bash
$ ss delete experiments
Delete 'experiments'? This cannot be undone. [y/N]: y
Deleted: experiments
```

Does not delete associated GitHub repository (if any).

#### `ss status`

Shows VM and system status.

```bash
$ ss status
VM:        running (uptime: 3d 4h)
CPU:       4 cores
Memory:    8 GB (3.2 GB used)
Disk:      100 GB (34 GB used)
Projects:  3
Browser:   connected
Claude:    logged in
```

#### `ss stop`

Stops the VM gracefully.

```bash
$ ss stop
Stopping VM...
Stopped.
```

Active sessions are terminated. Project files (on host) are unaffected.

#### `ss reset`

Resets VM to fresh state.

```bash
$ ss reset
This will:
  • Stop the VM
  • Reset to fresh state
  • Require re-login to Claude Code, gh, vercel

Projects in ~/super-sandbox/projects/ are NOT affected.

Continue? [y/N]: y
Resetting...
Done.
```

#### `ss config`

Opens settings menu.

```
╭───────────────────────────────────────────────────────────╮
│  Settings                                                 │
│                                                           │
│  VM Resources:                                            │
│    CPUs:      4                                           │
│    Memory:    8 GB                                        │
│    Disk:      100 GB (34 GB used)                         │
│                                                           │
│  ──────────────────────────────────────────────────────── │
│                                                           │
│  [1] Adjust VM resources                                  │
│  [2] Reset VM (keeps projects)                            │
│  [3] Factory reset (deletes everything)                   │
│  [b] Back                                                 │
│                                                           │
╰───────────────────────────────────────────────────────────╯
```

#### `ss config set <key> <value>`

Sets configuration value directly.

```bash
$ ss config set memory 16GB
Memory set to 16 GB. Restart VM to apply.

$ ss config set cpus 8
CPUs set to 8. Restart VM to apply.
```

#### `ss update`

Manually triggers update check and installation.

```bash
$ ss update
Current version: 1.2.0
Latest version:  1.3.0

Updating...
Updated to 1.3.0
```

---

## Project Management

### Project Location

All projects live in a fixed location:

```
~/super-sandbox/projects/
```

This directory is mounted into the VM at `/home/sandbox/projects/`.

### Project Scaffold

`ss new <name>` creates a minimal scaffold:

```
<name>/
├── .git/           # Initialized git repository
├── AGENTS.md       # Agent instructions
└── README.md       # Project readme
```

#### AGENTS.md Template

```markdown
# AGENTS.md

Instructions for AI coding agents working on this project.

## Project Overview

[Describe your project here]

## Development

### Setup

[Setup instructions]

### Commands

[Common commands]

## Browser Automation

This project supports browser automation via the host Chrome browser.
Claude Code can navigate, click, type, and capture screenshots using
your existing login sessions.

## Deployment

This project can be deployed to Vercel:

```bash
vercel
```

## Guidelines

- [Project-specific guidelines]
```

#### README.md Template

```markdown
# <name>

[Project description]

## Development

Created with [Super-Sandbox](https://github.com/anthropics/super-sandbox).

### Local (Sandboxed)

```bash
ss <name>
```

### Claude Code Web

Open this repository in Claude Code Web.
```

### Project Metadata

Project metadata is stored in a dotfile within each project:

```
<name>/.ss/metadata.json
```

```json
{
  "created": "2025-01-15T10:30:00Z",
  "lastAccessed": "2025-01-15T14:22:00Z",
  "githubRepo": "username/name"
}
```

This file is gitignored by default.

---

## VM Management

### VM Runtime

Super-Sandbox uses [Lume](https://github.com/trycua/cua) as the VM runtime. Lume provides:

- Apple Virtualization Framework integration
- virtio-fs for shared directories
- Simple CLI and API

### VM Lifecycle

```
                    install
    [not exists] ─────────────► [stopped]
                                    │
                         ss <proj>  │  ss stop
                         auto-start │
                                    ▼
                               [running] ◄───┐
                                    │        │
                              ss reset       │ ss <proj>
                                    │        │ (reconnect)
                                    ▼        │
                               [stopped] ────┘
```

### Auto-Start

When running `ss <project>`, the CLI:

1. Checks if VM is running
2. If not, starts VM automatically
3. Waits for SSH to become available (timeout: 30s)
4. Connects and launches Claude Code

Users never need to manually start the VM.

### Resource Allocation

Default resources:

| Resource | Default | Minimum | Maximum |
|----------|---------|---------|---------|
| CPUs | 4 | 2 | Host cores |
| Memory | 8 GB | 4 GB | Host RAM - 4 GB |
| Disk | 100 GB | 20 GB | Available space |

Resources can be adjusted via `ss config set`.

### SSH Connection

The CLI connects to the VM via SSH with PTY allocation:

```bash
ssh -t \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o LogLevel=ERROR \
    -p 2222 \
    sandbox@localhost \
    "cd ~/projects/<name> && claude"
```

For terminal mode (`-t`), replace `claude` with `bash`.

### Parallel Sessions

Multiple SSH sessions connect to the same VM simultaneously:

- Each `ss <project>` opens a new SSH connection
- Each connection gets its own PTY
- Claude Code instances run as separate processes
- File operations on the same project may conflict (same as two developers editing same file)

### Port Forwarding

**Strategy: First wins.**

When a dev server starts on a port (e.g., 3000):

1. First server to bind succeeds
2. Subsequent servers on same port get "address in use" error
3. Claude Code can recover by choosing a different port

This is simple and matches native behavior. Claude Code is capable of handling port conflicts automatically.

---

## Browser Bridge

### Purpose

The browser bridge enables Claude Code running in the VM to control Chrome on the host. This provides:

1. **Browser automation** using existing login sessions
2. **OAuth flows** for gh, vercel, and other tools
3. **URL opening** from VM applications

### Architecture

```
VM                          Host
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Claude Code    │         │  ss-bridge      │         │  Chrome         │
│                 │         │                 │         │                 │
│  Browser tool   │───sock──│  Unix socket    │         │  Claude in      │
│  gh auth login  │         │  listener       │───nm────│  Chrome ext     │
│  vercel login   │         │                 │         │                 │
│  open <url>     │         │  URL intercept  │───open──│  New tab        │
└─────────────────┘         └─────────────────┘         └─────────────────┘

sock = Unix socket (/tmp/ss-browser-bridge.sock)
nm = Native Messaging (Chrome's stdio protocol)
open = macOS `open` command
```

### Native Messaging Protocol

Chrome's Native Messaging uses length-prefixed JSON messages:

```
[4-byte length (little-endian)][JSON message]
```

The bridge client in the VM and ss-bridge on the host both implement this protocol.

### Bridge Client (VM Side)

A simple script/binary in the VM that:

1. Connects to Unix socket (mounted from host)
2. Sends commands in Native Messaging format
3. Receives responses
4. Provides CLI interface for manual testing

Location: `/home/sandbox/.local/bin/ss-browser`

Usage:
```bash
# From within VM
ss-browser navigate "https://example.com"
ss-browser screenshot
ss-browser click "#login-button"
```

Claude Code's browser tool uses this under the hood.

### OAuth Flow Handling

When a tool needs browser authentication:

```
1. gh auth login
2. gh opens URL: https://github.com/login/device
3. Bridge intercepts URL open request
4. Bridge opens URL in host Chrome
5. User completes auth in host browser
6. gh receives callback/token
7. Auth complete
```

The bridge intercepts URL opens via:
- Direct requests from bridge client
- `xdg-open` / custom open handler in VM

### Request Serialization

Multiple Claude Code sessions may send browser commands simultaneously. The bridge serializes these:

1. Commands queue in order received
2. Each command completes before next starts
3. Timeout per command (30s default)
4. Caller blocks until response

This prevents race conditions in Chrome automation.

### Connection Validation

On startup, `ss` validates browser bridge connectivity:

1. Check if Chrome is running
2. Check if Claude in Chrome extension is installed
3. Test Native Messaging connection

If validation fails:

```
╭───────────────────────────────────────────────────────────╮
│  Browser Setup Required                                   │
│                                                           │
│  Super-Sandbox needs Claude in Chrome extension.          │
│                                                           │
│  1. Open Chrome                                           │
│  2. Install: chrome.google.com/webstore/detail/claude...  │
│  3. Run 'ss' again                                        │
│                                                           │
╰───────────────────────────────────────────────────────────╯
```

---

## Installation

### Requirements

| Requirement | Details |
|-------------|---------|
| macOS | 13.0 (Ventura) or later |
| Architecture | Apple Silicon (M1/M2/M3/M4) |
| RAM | 8 GB minimum, 16 GB recommended |
| Disk | 20 GB free space |
| Chrome | Latest stable version |
| Claude in Chrome | Extension installed and logged in |
| Claude subscription | Pro, Max, Team, or Enterprise |

### Install Command

```bash
curl -fsSL https://supersandbox.dev/install.sh | bash
```

### Installer Steps

```bash
#!/bin/bash
set -euo pipefail

echo "╭───────────────────────────────────────╮"
echo "│  Super-Sandbox Installer              │"
echo "╰───────────────────────────────────────╯"
echo

# 1. Check architecture
if [[ $(uname -m) != "arm64" ]]; then
    echo "Error: Super-Sandbox requires Apple Silicon (M1/M2/M3/M4)."
    exit 1
fi

# 2. Check macOS version
macos_version=$(sw_vers -productVersion | cut -d. -f1)
if [[ $macos_version -lt 13 ]]; then
    echo "Error: Super-Sandbox requires macOS 13 (Ventura) or later."
    exit 1
fi

# 3. Install Lume if needed
if ! command -v lume &> /dev/null; then
    echo "Installing Lume (VM runtime)..."
    curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh | bash
fi

# 4. Check for Chrome
if [[ ! -d "/Applications/Google Chrome.app" ]]; then
    echo "Warning: Google Chrome not found."
    echo "Install Chrome from: https://google.com/chrome"
    echo "Then install the Claude in Chrome extension."
fi

# 5. Create directories
echo "Creating directories..."
mkdir -p ~/super-sandbox/projects

# 6. Download CLI binaries
echo "Downloading Super-Sandbox..."
curl -fsSL "https://supersandbox.dev/releases/latest/ss-darwin-arm64" \
    -o /usr/local/bin/ss
chmod +x /usr/local/bin/ss

curl -fsSL "https://supersandbox.dev/releases/latest/ss-bridge-darwin-arm64" \
    -o /usr/local/bin/ss-bridge
chmod +x /usr/local/bin/ss-bridge

# 7. Register Native Messaging host
echo "Registering browser bridge..."
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts
cat > ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/dev.supersandbox.bridge.json << 'EOF'
{
  "name": "dev.supersandbox.bridge",
  "description": "Super-Sandbox Browser Bridge",
  "path": "/usr/local/bin/ss-bridge",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://EXTENSION_ID_HERE/"
  ]
}
EOF

# 8. Pull VM image
echo "Downloading sandbox environment..."
lume pull ghcr.io/supersandbox/base:latest

# 9. Create VM
echo "Creating VM..."
lume create super-sandbox ghcr.io/supersandbox/base:latest
lume set super-sandbox --cpu 4 --memory 8GB --disk-size 100GB

# 10. Configure mount
lume mount super-sandbox ~/super-sandbox/projects /home/sandbox/projects

# 11. Create default config
cat > ~/super-sandbox/config.yaml << 'EOF'
version: 1
vm:
  cpus: 4
  memory: 8GB
  disk: 100GB
EOF

echo
echo "╭───────────────────────────────────────╮"
echo "│  Installation complete!               │"
echo "│                                       │"
echo "│  Run 'ss' to get started              │"
echo "╰───────────────────────────────────────╯"
```

### First Run

```bash
$ ss

╭───────────────────────────────────────────────────────────╮
│  Super-Sandbox                                            │
│                                                           │
│  No projects yet. Create one:                             │
│                                                           │
│  Project name: my-first-project                           │
│                                                           │
╰───────────────────────────────────────────────────────────╯

Created: ~/super-sandbox/projects/my-first-project

Starting VM...
Connecting...

  ╭───────────────────────────────────────────────────────╮
  │  Super-Sandbox · my-first-project                     │
  │                                                       │
  │  First time? Run: /login                              │
  ╰───────────────────────────────────────────────────────╯

>
```

### Uninstallation

```bash
# Stop and delete VM
lume stop super-sandbox
lume delete super-sandbox

# Remove CLI binaries
sudo rm /usr/local/bin/ss
sudo rm /usr/local/bin/ss-bridge

# Remove Native Messaging registration
rm ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/dev.supersandbox.bridge.json

# Remove data (optional - deletes all projects!)
rm -rf ~/super-sandbox
```

---

## Configuration

### Config File

Location: `~/super-sandbox/config.yaml`

```yaml
version: 1

# VM resources
vm:
  cpus: 4           # 2-8 recommended
  memory: 8GB       # 4GB minimum, 16GB for heavy workloads
  disk: 100GB       # Maximum disk size (grows as needed)

# Auto-update settings
updates:
  check: true       # Check for updates on launch
  auto_apply: true  # Apply updates automatically
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SS_HOME` | Override config/projects location | `~/super-sandbox` |
| `SS_NO_UPDATE` | Disable update checks | unset |
| `SS_DEBUG` | Enable debug logging | unset |

---

## Security Model

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Malicious code damages host | VM isolation: all code runs in Linux VM |
| Code accesses unintended files | Only mounted project directory is accessible |
| Credential theft from host | VM is fresh environment, no host credentials |
| Browser session hijacking | User controls Chrome, can observe all actions |
| VM escape | Apple Virtualization Framework provides hardware isolation |

### What's Sandboxed

- All bash commands executed by Claude Code
- All file operations (read, write, delete)
- All code execution (node, python, etc.)
- All package installations (npm, pip)
- All git operations
- All network requests from code

### What's NOT Sandboxed

- Browser automation (intentional - uses host Chrome)
- Project files (accessible from host via mount)
- Network access from VM (full internet access by default)

### Comparison to Claude Cowork

| Aspect | Cowork | Super-Sandbox |
|--------|--------|---------------|
| VM isolation | Yes | Yes |
| Nested sandboxing | Yes (bubblewrap + seccomp) | No |
| Browser access | Host Chrome | Host Chrome |
| Session persistence | Ephemeral | Persistent |
| Multi-session | Yes | Yes |
| Target user | Non-developers | Developers |

Super-Sandbox trades some defense-in-depth (no nested sandboxing) for persistence and simplicity.

---

## Error Handling

### VM Errors

#### VM Won't Start

```
Error: VM failed to start

Possible causes:
  • Not enough memory (need 4GB free)
  • Not enough disk space (need 5GB free)
  • Lume not installed

Try:
  ss reset          # Reset VM
  lume ls           # Check Lume status
```

#### SSH Connection Failed

```
Error: Could not connect to VM

The VM is running but SSH is not responding.

Try:
  ss reset          # Reset VM
  ss status         # Check VM status
```

### Browser Errors

#### Chrome Not Running

```
Error: Chrome is not running

Start Chrome and try again.
```

#### Extension Not Found

```
Error: Claude in Chrome extension not found

Install the extension:
  1. Open Chrome
  2. Go to: chrome.google.com/webstore/detail/claude/...
  3. Click "Add to Chrome"
  4. Run 'ss' again
```

#### Bridge Connection Failed

```
Error: Could not connect to browser bridge

Try:
  1. Restart Chrome
  2. Run 'ss' again

If the problem persists, reinstall:
  curl -fsSL https://supersandbox.dev/install.sh | bash
```

### Project Errors

#### Project Not Found

```
Error: Project 'foo' not found

Available projects:
  my-app
  client-website

Create a new project:
  ss new foo
```

#### Project Already Exists

```
Error: Project 'my-app' already exists

Open it:
  ss my-app

Or choose a different name:
  ss new my-app-v2
```

---

## Migration from v1

Super-Sandbox v2 is a complete reimagining. There is no automatic migration.

### What Changes

| v1 | v2 |
|----|-----|
| Template repository | CLI tool |
| Fork to use | Install to use |
| Cloud-focused | Local-first |
| Skills folders | Minimal scaffold |
| Browserless HTTP | Native Chrome bridge |

### For Existing Users

If you used Super-Sandbox v1 (the template):

1. Your existing projects continue to work in CC Web
2. You can install v2 alongside
3. Create new projects with `ss new`
4. Gradually migrate if desired

The v1 template repository will be archived but remain accessible.

---

## Appendix: VM Image Specification

### Base Image

- Ubuntu 24.04 LTS ARM64
- Minimal server installation

### Pre-installed Packages

```
# System
build-essential
git
curl
wget
unzip
jq
ripgrep
htop
openssh-server

# Node.js (via NodeSource)
nodejs (LTS)
npm

# Python
python3
python3-pip
python3-venv

# Claude Code
@anthropic-ai/claude-code (global npm)

# GitHub CLI
gh

# Vercel CLI
vercel (global npm)
```

### User Configuration

- Username: `sandbox`
- Home: `/home/sandbox`
- Shell: `/bin/bash`
- Sudo: passwordless

### SSH Configuration

```
Port 22
PermitEmptyPasswords yes
PasswordAuthentication yes
PubkeyAuthentication yes
```

### Directory Structure

```
/home/sandbox/
├── projects/              # Mounted from host
├── .claude/               # Claude Code credentials
├── .config/
│   ├── gh/                # GitHub CLI config
│   └── vercel/            # Vercel CLI config
├── .local/
│   └── bin/
│       └── ss-browser     # Browser bridge client
└── .bashrc                # Shell configuration
```

### MOTD

```
  ╭───────────────────────────────────────────────────────╮
  │                                                       │
  │   Super-Sandbox                                       │
  │                                                       │
  │   You're in an isolated Linux environment.            │
  │   Your projects are in ~/projects                     │
  │                                                       │
  │   Commands:                                           │
  │     claude          Start Claude Code                 │
  │     gh              GitHub CLI                        │
  │     vercel          Vercel CLI                        │
  │     exit            Return to macOS                   │
  │                                                       │
  ╰───────────────────────────────────────────────────────╯
```

---

## Appendix: Release & Updates

### Version Scheme

Semantic versioning: `MAJOR.MINOR.PATCH`

- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

### Update Mechanism

On every `ss` invocation:

1. Check version endpoint (async, non-blocking)
2. Compare with current version
3. If update available:
   - Download new binary in background
   - Replace on next invocation

```go
// Pseudocode
func checkUpdate() {
    resp := fetch("https://supersandbox.dev/version")
    if resp.version > currentVersion {
        downloadInBackground(resp.downloadURL)
        stageUpdate()
    }
}

func applyPendingUpdate() {
    if stagedUpdateExists() {
        replaceBinary()
        log("Updated to version X.Y.Z")
    }
}
```

### Release Artifacts

- `ss-darwin-arm64` - Main CLI
- `ss-bridge-darwin-arm64` - Browser bridge
- `install.sh` - Installer script
- `checksums.txt` - SHA256 checksums

Hosted at: `https://supersandbox.dev/releases/{version}/`

---

## Appendix: Future Considerations

Not in v2.0 scope, but worth noting:

1. **Network restrictions** - Allow/deny lists for VM network access
2. **Multiple VMs** - Different environments (Node 18 vs 20, etc.)
3. **Snapshots** - Save/restore VM state
4. **Windows/Linux support** - Extend beyond macOS
5. **Team features** - Shared configurations, audit logs
6. **Cloud option** - Hosted VMs for users without Apple Silicon
