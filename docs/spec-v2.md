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
│  │  • Extension ID: fcoeoabgfenejglbffodgkkbkcdhcgfn                  │  │
│  │  • Has access to all logged-in sessions                            │  │
│  │  • 26+ MCP tools: navigate, click, type, screenshot, etc.         │  │
│  └─────────────────────────┬──────────────────────────────────────────┘  │
│                            │                                             │
│                            │ Native Messaging (stdio)                    │
│                            │                                             │
│  ┌─────────────────────────▼──────────────────────────────────────────┐  │
│  │  chrome-native-host (from Claude Code installation)                │  │
│  │                                                                    │  │
│  │  • Binary at: ~/.claude/chrome/chrome-native-host                  │  │
│  │  • Bridges MCP protocol ↔ Native Messaging                         │  │
│  │  • Already installed when user has Claude Code                     │  │
│  └─────────────────────────┬──────────────────────────────────────────┘  │
│                            │                                             │
│                            │ MCP Protocol (Unix socket)                  │
│                            │ /tmp/claude-mcp-browser-bridge-$USER/...   │
│                            │                                             │
│  ┌─────────────────────────┴──────────────────────────────────────────┐  │
│  │  ss CLI                                                            │  │
│  │                                                                    │  │
│  │  • Manages VM lifecycle via Lume                                   │  │
│  │  • Creates and manages projects                                    │  │
│  │  • SSH with MCP socket tunneling (critical for browser access)     │  │
│  │  • Discovers host MCP socket path dynamically                      │  │
│  │  • Auto-updates on launch                                          │  │
│  └─────────────────────────┬──────────────────────────────────────────┘  │
│                            │                                             │
│                            │ SSH + Socket Forwarding                     │
│                            │ (tunnels MCP socket from host to VM)        │
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
│  │  Terminal 1 ──► claude --chrome ──► ~/projects/my-app              │  │
│  │  Terminal 2 ──► claude --chrome ──► ~/projects/my-app              │  │
│  │  Terminal 3 ──► claude --chrome ──► ~/projects/other-proj          │  │
│  │                         │                                          │  │
│  │                         │ MCP (tunneled socket)                    │  │
│  │                         ▼                                          │  │
│  │         /tmp/claude-mcp-browser-bridge-sandbox/...sock             │  │
│  │                         │                                          │  │
│  │                         │ (tunneled to host socket)                │  │
│  │                         ▼                                          │  │
│  │                   Host Chrome                                      │  │
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
- **MCP socket discovery and tunneling** (enables browser automation in VM)
- Configuration management
- Auto-update on launch

#### Claude Code (Host) - Prerequisite

- Provides `chrome-native-host` binary at `~/.claude/chrome/chrome-native-host`
- Registers Native Messaging host with Chrome
- Creates MCP socket at `/tmp/claude-mcp-browser-bridge-$USER/`
- **Must be installed on host before using Super-Sandbox**

#### VM Image

- Ubuntu 24.04 ARM64
- Pre-installed tools: Claude Code, gh, vercel, node (LTS), python3, git, build-essential
- SSH server for terminal access
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

### How It Works

Super-Sandbox does **not** implement its own browser bridge. Instead, it tunnels Claude Code's existing MCP socket from the host into the VM. This ensures 100% compatibility with the Claude in Chrome extension.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VM                                                                         │
│                                                                             │
│  Claude Code (claude --chrome)                                              │
│       │                                                                     │
│       │ MCP Protocol                                                        │
│       ▼                                                                     │
│  /tmp/claude-mcp-browser-bridge-sandbox/<session>.sock                      │
│       │                                                                     │
│       │ (SSH remote socket forwarding)                                      │
│       │                                                                     │
└───────┼─────────────────────────────────────────────────────────────────────┘
        │
        │ Tunneled via: ssh -R <vm-sock>:<host-sock>
        │
┌───────▼─────────────────────────────────────────────────────────────────────┐
│  Host (macOS)                                                               │
│                                                                             │
│  /tmp/claude-mcp-browser-bridge-$USER/<session>.sock                        │
│       │                                                                     │
│       │ MCP Protocol                                                        │
│       ▼                                                                     │
│  chrome-native-host (~/.claude/chrome/chrome-native-host)                   │
│       │                                                                     │
│       │ Native Messaging (stdio, length-prefixed JSON)                      │
│       ▼                                                                     │
│  Chrome + Claude in Chrome Extension                                        │
│       │                                                                     │
│       │ Chrome APIs (tabs, scripting, debugger)                             │
│       ▼                                                                     │
│  Browser Tabs (with your logged-in sessions)                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### MCP Socket Discovery

The host MCP socket path is dynamic and includes the username and session ID:

```
/tmp/claude-mcp-browser-bridge-$USER/<pid>.sock
```

The `ss` CLI must discover this socket on each connection:

```go
// Pseudocode for socket discovery
func discoverMCPSocket() (string, error) {
    pattern := fmt.Sprintf("/tmp/claude-mcp-browser-bridge-%s/*.sock", os.Getenv("USER"))
    matches, err := filepath.Glob(pattern)
    if err != nil || len(matches) == 0 {
        return "", errors.New("no MCP socket found - is Claude Code running with --chrome?")
    }
    // Return most recently modified socket
    return mostRecent(matches), nil
}
```

**Important**: The socket only exists when Claude Code is running with Chrome integration enabled on the host. The `ss` CLI should:

1. Check if a socket exists
2. If not, prompt user to run `claude --chrome` on host first (or start it automatically)
3. Once socket is found, establish the tunnel

### SSH Socket Forwarding

The `ss` CLI uses SSH remote socket forwarding to tunnel the MCP socket:

```bash
ssh -t \
    -R /tmp/claude-mcp-browser-bridge-sandbox/bridge.sock:/tmp/claude-mcp-browser-bridge-$USER/<discovered>.sock \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o LogLevel=ERROR \
    -p 2222 \
    sandbox@localhost \
    "cd ~/projects/<name> && claude --chrome"
```

The `-R` flag creates a reverse tunnel: the VM socket path maps to the host socket.

### OAuth Flow Handling

OAuth flows (gh, vercel login) work automatically because:

1. `gh auth login` triggers a browser open via Claude Code's MCP
2. The MCP command is tunneled to the host
3. Host's `chrome-native-host` receives the command
4. Chrome on host opens the OAuth URL
5. User completes auth in host browser
6. Callback completes the flow

No special handling required—it's the same flow as running Claude Code directly on the host.

### Parallel Sessions

Multiple Claude Code sessions in the VM can share browser access:

- Each session connects to the same tunneled socket
- The host's `chrome-native-host` handles concurrent MCP requests
- Chrome extension manages multiple tabs as needed

This works because we're using Claude Code's native implementation, which already supports parallel access.

### Connection Validation

On startup, `ss` validates the browser bridge:

1. **Check Claude Code installation on host**: Look for `~/.claude/chrome/chrome-native-host`
2. **Check for MCP socket**: Look for `/tmp/claude-mcp-browser-bridge-$USER/*.sock`
3. **Check Chrome is running**: Required for browser automation
4. **Check Claude in Chrome extension**: The extension must be installed

If validation fails:

```
╭───────────────────────────────────────────────────────────╮
│  Browser Setup Required                                   │
│                                                           │
│  Super-Sandbox requires Claude Code with Chrome enabled.  │
│                                                           │
│  1. Install Claude Code: npm install -g @anthropic-ai/claude-code
│  2. Run: claude --chrome                                  │
│  3. Install Claude in Chrome extension when prompted      │
│  4. Run 'ss' again                                        │
│                                                           │
╰───────────────────────────────────────────────────────────╯
```

### Browser Capabilities

Once connected, Claude Code in the VM has full access to browser automation:

| Category | Tools |
|----------|-------|
| Navigation | navigate, create_tab, close_tab, list_pages, switch_page |
| Input | click, type, drag_and_drop, hover, keyboard, upload_file |
| Forms | fill_input, fill_form, handle_dialog |
| Inspection | screenshot, snapshot, execute_js, get_console_messages |
| Network | list_network_requests, get_network_request |
| Emulation | emulate_device, resize_page |

These are the same tools available when running Claude Code directly on the host.

### Fallback: Chrome DevTools MCP

If Claude in Chrome socket tunneling doesn't work reliably (e.g., socket path changes, MCP protocol incompatibilities, or extension updates), Super-Sandbox provides a fallback using [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp).

#### How It Works

Chrome DevTools MCP connects directly to Chrome's debugging protocol (CDP) over HTTP/WebSocket, bypassing the Claude in Chrome extension entirely.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VM                                                                         │
│                                                                             │
│  Claude Code                                                                │
│       │                                                                     │
│       │ MCP Protocol (local)                                                │
│       ▼                                                                     │
│  chrome-devtools-mcp server (runs in VM)                                    │
│       │                                                                     │
│       │ Chrome DevTools Protocol (CDP)                                      │
│       │ http://localhost:9222 (tunneled)                                    │
│       │                                                                     │
└───────┼─────────────────────────────────────────────────────────────────────┘
        │
        │ SSH Local Port Forward: ssh -L 9222:localhost:9222
        │
┌───────▼─────────────────────────────────────────────────────────────────────┐
│  Host (macOS)                                                               │
│                                                                             │
│  Chrome (launched with remote debugging)                                    │
│       │                                                                     │
│       │ --remote-debugging-port=9222                                        │
│       │ --user-data-dir=~/.chrome-debug-profile                             │
│       │                                                                     │
│  Browser Tabs (with your logged-in sessions)                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Host Setup

Chrome must be launched with remote debugging enabled:

```bash
# Create a helper script: ~/super-sandbox/start-chrome-debug.sh
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --remote-debugging-port=9222 \
    --user-data-dir="$HOME/.chrome-debug-profile"
```

**Important**: The `--user-data-dir` flag creates a persistent profile. Log into your services once, and those sessions persist across restarts.

#### SSH Port Forwarding

The `ss` CLI forwards the debugging port from host to VM:

```bash
ssh -t \
    -L 9222:localhost:9222 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o LogLevel=ERROR \
    -p 2222 \
    sandbox@localhost \
    "cd ~/projects/<name> && claude"
```

The `-L 9222:localhost:9222` creates a local forward: VM's localhost:9222 → Host's localhost:9222.

#### VM Configuration

Claude Code in the VM is configured with the Chrome DevTools MCP server:

```bash
# Run once in VM to configure
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --browserUrl=http://127.0.0.1:9222
```

This is pre-configured in the VM image, so users don't need to set it up manually.

#### Capabilities Comparison

| Capability | Claude in Chrome | Chrome DevTools MCP |
|------------|------------------|---------------------|
| Navigate pages | ✓ | ✓ |
| Click, type, forms | ✓ | ✓ |
| Screenshots | ✓ | ✓ |
| Console logs | ✓ | ✓ |
| Network requests | ✓ | ✓ |
| Performance tracing | ✗ | ✓ |
| DOM snapshots | ✓ | ✓ |
| Existing login sessions | ✓ (automatic) | ✓ (via --user-data-dir) |
| Works without extension | ✗ | ✓ |
| Requires Chrome restart | ✗ | ✓ (with debug flags) |

Both approaches provide equivalent browser automation capabilities. The key differences:

- **Claude in Chrome**: Seamless, uses existing Chrome instance, no restart needed
- **Chrome DevTools MCP**: More reliable/predictable, adds performance tracing, requires Chrome launched with debug flags

#### Automatic Fallback Detection

The `ss` CLI attempts the primary approach (socket tunneling) first. If it fails:

1. Check if MCP socket exists on host
2. If not found, check if Chrome is running with `--remote-debugging-port`
3. If debug port available, use Chrome DevTools MCP fallback
4. If neither works, prompt user with setup instructions

```
╭───────────────────────────────────────────────────────────────────────╮
│  Browser Integration                                                  │
│                                                                       │
│  Primary method (Claude in Chrome) not available.                     │
│  Falling back to Chrome DevTools MCP.                                 │
│                                                                       │
│  Start Chrome with debugging enabled:                                 │
│    ~/super-sandbox/start-chrome-debug.sh                              │
│                                                                       │
│  Or run manually:                                                     │
│    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \   │
│        --remote-debugging-port=9222 \                                 │
│        --user-data-dir="$HOME/.chrome-debug-profile"                  │
│                                                                       │
╰───────────────────────────────────────────────────────────────────────╯
```

#### Security Note

Chrome's remote debugging protocol has no authentication. The debug port (9222) should only be bound to localhost. The SSH tunnel ensures only the VM can access it. Never use `--remote-debugging-address=0.0.0.0` as this would expose your browser to the network.

---

## Installation

### Requirements

| Requirement | Details |
|-------------|---------|
| macOS | 13.0 (Ventura) or later |
| Architecture | Apple Silicon (M1/M2/M3/M4) |
| RAM | 8 GB minimum, 16 GB recommended |
| Disk | 20 GB free space |
| **Claude Code** | **Installed on host (`npm install -g @anthropic-ai/claude-code`)** |
| Chrome | Latest stable version |
| Claude in Chrome | Extension installed (prompted by `claude --chrome`) |
| Claude subscription | Pro, Max, Team, or Enterprise |

**Note**: Claude Code on the host is a hard requirement. Super-Sandbox tunnels the browser connection from the host's Claude Code installation—it does not implement its own browser bridge.

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

# 3. Check for Claude Code (REQUIRED)
if ! command -v claude &> /dev/null; then
    echo "Error: Claude Code is required but not installed."
    echo
    echo "Install it with:"
    echo "  npm install -g @anthropic-ai/claude-code"
    echo
    echo "Then run this installer again."
    exit 1
fi

# 4. Check for chrome-native-host (indicates Chrome integration is set up)
if [[ ! -f "$HOME/.claude/chrome/chrome-native-host" ]]; then
    echo "Warning: Claude Code Chrome integration not set up."
    echo
    echo "Run 'claude --chrome' once to set up browser integration,"
    echo "then run this installer again."
    echo
fi

# 5. Install Lume if needed
if ! command -v lume &> /dev/null; then
    echo "Installing Lume (VM runtime)..."
    curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/lume/scripts/install.sh | bash
fi

# 6. Check for Chrome
if [[ ! -d "/Applications/Google Chrome.app" ]]; then
    echo "Warning: Google Chrome not found."
    echo "Install Chrome from: https://google.com/chrome"
fi

# 7. Create directories
echo "Creating directories..."
mkdir -p ~/super-sandbox/projects

# 8. Download CLI binary
echo "Downloading Super-Sandbox..."
curl -fsSL "https://supersandbox.dev/releases/latest/ss-darwin-arm64" \
    -o /usr/local/bin/ss
chmod +x /usr/local/bin/ss

# 9. Pull VM image
echo "Downloading sandbox environment..."
lume pull ghcr.io/supersandbox/base:latest

# 10. Create VM
echo "Creating VM..."
lume create super-sandbox ghcr.io/supersandbox/base:latest
lume set super-sandbox --cpu 4 --memory 8GB --disk-size 100GB

# 11. Configure mount
lume mount super-sandbox ~/super-sandbox/projects /home/sandbox/projects

# 12. Create default config
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

# Remove CLI binary
sudo rm /usr/local/bin/ss

# Remove data (optional - deletes all projects!)
rm -rf ~/super-sandbox

# Note: Claude Code, Chrome, and the Claude in Chrome extension
# are not modified by Super-Sandbox and don't need cleanup.
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

#### Claude Code Not Installed

```
Error: Claude Code is not installed

Super-Sandbox requires Claude Code on the host for browser integration.

Install it:
  npm install -g @anthropic-ai/claude-code

Then run 'ss' again.
```

#### Chrome Integration Not Set Up

```
Error: Claude Code Chrome integration not found

Run this command on your host (not in the sandbox):
  claude --chrome

This sets up the browser bridge. Then run 'ss' again.
```

#### MCP Socket Not Found (Primary Method)

```
Warning: Claude in Chrome socket not found

Checking for Chrome DevTools fallback...
Found Chrome with remote debugging on port 9222.
Using Chrome DevTools MCP for browser automation.
```

If Chrome isn't running with debugging:

```
Error: No browser integration available

Option 1 (Recommended): Run 'claude --chrome' on host
Option 2 (Fallback): Start Chrome with debugging:
  ~/super-sandbox/start-chrome-debug.sh

Then run 'ss' again.
```

#### Chrome Not Running

```
Error: Chrome is not running

Start Chrome and try again.

For browser automation, either:
  • Run 'claude --chrome' on host, or
  • Run '~/super-sandbox/start-chrome-debug.sh'
```

#### Both Methods Unavailable

```
Error: Browser integration unavailable

Neither Claude in Chrome nor Chrome DevTools debugging is available.

To enable browser automation:

  Primary (Claude in Chrome):
    1. Run 'claude --chrome' on host
    2. Keep it running

  Fallback (Chrome DevTools):
    1. Run ~/super-sandbox/start-chrome-debug.sh
    2. Or: /Applications/Google\ Chrome.app/.../Google\ Chrome \
           --remote-debugging-port=9222 \
           --user-data-dir="$HOME/.chrome-debug-profile"

Then run 'ss' again.
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
| Browserless HTTP | MCP socket tunneling to host Chrome |

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

# Browser automation fallback
chrome-devtools-mcp (pre-configured as MCP server)
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
└── .bashrc                # Shell configuration
```

**Browser Integration**: Two methods are pre-configured:

1. **Primary**: Claude Code's `--chrome` integration via tunneled MCP socket
2. **Fallback**: Chrome DevTools MCP connecting to host's debug port (9222)

The `ss` CLI automatically selects the appropriate method based on what's available on the host.

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
