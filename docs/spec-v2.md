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

---

## Appendix: Implementation Planning

> **Status: PLANNING PHASE**
>
> This section coordinates the creation of a detailed implementation plan.
> Each domain will be researched and planned by a dedicated worker.

### Planning Approach

The spec above describes *what* to build. This section coordinates *how* to build it.

Each domain gets its own planning task:
1. Worker researches the domain (tools, libraries, patterns)
2. Worker proposes technology choices with rationale
3. Worker breaks down into discrete implementation tasks (2-4 hour chunks)
4. Worker defines done criteria and test strategy for each task

### Domains

| # | Domain | Scope | Key Research Questions |
|---|--------|-------|------------------------|
| 1 | **CLI Framework** | Go project setup, command structure, TUI | Which CLI framework? Cobra vs alternatives? Bubbletea for TUI? Project structure? |
| 2 | **Lume Integration** | VM lifecycle, resource config, mounts | Lume CLI vs Go SDK? How to detect VM state? Mount API? |
| 3 | **SSH & PTY** | Connection management, PTY passthrough | Go SSH libraries? PTY handling for interactive sessions? |
| 4 | **MCP Socket Bridge** | Socket discovery, SSH tunneling | Socket forwarding syntax? Multiple session handling? |
| 5 | **DevTools Fallback** | CDP detection, port forwarding | How to detect Chrome debug port? Fallback triggering logic? |
| 6 | **Project Management** | Scaffold, metadata, CRUD operations | File operations in Go? Template embedding? |
| 7 | **Configuration** | YAML parsing, validation, env vars | Viper vs alternatives? Config migration strategy? |
| 8 | **Distribution** | Install script, binary builds, auto-update | GoReleaser? Self-update libraries? Homebrew tap? |
| 9 | **VM Image** | Ubuntu image build, pre-installed tools | Packer vs cloud-init? Image hosting (GHCR)? |

### Domain Specs

Each domain planning task produces a mini-spec in this format:

```markdown
### Domain N: [Name]

#### Technology Choices
- **Choice**: [library/tool]
- **Rationale**: [why this over alternatives]
- **Alternatives Considered**: [what was rejected and why]

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| N.1 | ... | - | ... |
| N.2 | ... | N.1 | ... |

#### Test Strategy
- Unit tests: [what to test]
- Integration tests: [what to test]
- Manual verification: [what to check]

#### Open Questions
- [Any unresolved decisions needing human input]
```

---

### Domain 1: CLI Framework

**Status**: `complete`

#### Technology Choices

| Concern | Library | Version |
|---------|---------|---------|
| Command structure | **Cobra** | v1.9.x |
| Configuration | **Viper** | v1.x (Cobra integration) |
| Interactive TUI | **Bubble Tea** | v2 (`charm.land/bubbletea/v2`) |
| TUI Components | **Bubbles** | latest |
| Styling | **Lip Gloss** | latest |

**Rationale**:
- Cobra is the industry standard (used by gh, kubectl, docker CLI). Provides automatic help, shell completions, and intelligent typo suggestions ("Did you mean 'status'?")
- Viper integrates seamlessly with Cobra for config file + env var + flag precedence
- Bubble Tea v2 (2025) has synchronized output, native clipboard support, and improved mouse handling
- Bubbles provides `list.Model` with built-in fuzzy filtering—perfect for project selection

**Alternatives Considered**:
- **Kong**: Less boilerplate, struct-based. Rejected because Cobra's ecosystem (Viper, shell completions) is more mature for this use case
- **urfave/cli**: Simpler but lacks the intelligent suggestions and Viper integration
- **tview**: Rejected in favor of Bubble Tea's modern Elm architecture and Charm ecosystem integration

#### Project Structure

```
super-sandbox/
├── cmd/
│   └── ss/
│       └── main.go           # Entry point only
├── internal/
│   ├── cli/
│   │   ├── root.go           # Root command, version, global flags
│   │   ├── connect.go        # ss <project> - main entry
│   │   ├── new.go            # ss new <name>
│   │   ├── list.go           # ss list
│   │   ├── delete.go         # ss delete <name>
│   │   ├── status.go         # ss status
│   │   ├── stop.go           # ss stop
│   │   ├── reset.go          # ss reset
│   │   ├── config.go         # ss config / ss config set
│   │   └── update.go         # ss update
│   ├── config/
│   │   └── config.go         # Viper-based config management
│   ├── vm/
│   │   └── lume.go           # Lume VM lifecycle (Domain 2)
│   ├── ssh/
│   │   └── session.go        # SSH/PTY management (Domain 3)
│   ├── browser/
│   │   ├── mcp.go            # MCP socket bridge (Domain 4)
│   │   └── devtools.go       # CDP fallback (Domain 5)
│   ├── project/
│   │   └── project.go        # Project CRUD (Domain 6)
│   └── tui/
│       ├── selector.go       # Project selection menu
│       ├── settings.go       # Settings menu
│       └── styles.go         # Lip Gloss theme
├── go.mod
├── go.sum
└── Makefile
```

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 1.1 | Initialize Go module, add Cobra/Viper/BubbleTea deps | - | `go mod tidy` succeeds, deps in go.mod |
| 1.2 | Implement root command with version flag | 1.1 | `ss --version` prints version |
| 1.3 | Implement `ss <project>` connection flow (stub) | 1.2 | `ss my-project` prints "connecting to my-project" |
| 1.4 | Implement `ss new <name>` (stub) | 1.2 | `ss new test` prints "creating test" |
| 1.5 | Implement `ss list` (stub) | 1.2 | `ss list` prints placeholder list |
| 1.6 | Implement `ss delete <name>` (stub) | 1.2 | `ss delete test` prompts for confirmation |
| 1.7 | Implement `ss status` (stub) | 1.2 | `ss status` prints placeholder status |
| 1.8 | Implement `ss stop` (stub) | 1.2 | `ss stop` prints "stopping" |
| 1.9 | Implement `ss reset` (stub) | 1.2 | `ss reset` prompts for confirmation |
| 1.10 | Implement `ss config` menu (stub) | 1.2 | `ss config` shows settings menu |
| 1.11 | Implement `ss config set <k> <v>` (stub) | 1.10 | `ss config set memory 16GB` prints confirmation |
| 1.12 | Implement `ss update` (stub) | 1.2 | `ss update` prints version check |
| 1.13 | Build TUI project selector with Bubble Tea | 1.2 | `ss` (no args) shows interactive project menu |
| 1.14 | Add shell completion generation | 1.2 | `ss completion bash/zsh/fish` outputs completion script |
| 1.15 | Add error formatting with suggestions | 1.2 | Typos like `ss statu` suggest "did you mean 'status'?" |

**Note**: Tasks 1.3-1.12 are stubs that print placeholder output. Real implementation comes from other domains (VM, SSH, Project, Config).

#### Test Strategy

- **Unit tests**: Each command file gets a `_test.go` testing flag parsing and validation
- **Integration tests**: CLI invocation via `os/exec` verifying stdout/stderr output
- **Manual verification**:
  - Run `ss --help` and verify all commands listed
  - Run `ss completion zsh | head` and verify output looks correct
  - Run `ss` with no args and verify TUI selector appears

#### Open Questions

None - framework choices are well-established patterns.

---

### Domain 2: Lume Integration

**Status**: `complete`

#### Technology Choices

| Approach | Decision |
|----------|----------|
| Primary interface | **HTTP API** (via `lume serve` on port 7777) |
| Fallback interface | **CLI with JSON output** (`lume ... -f json`) |
| VM provisioning | **Pre-built image** from GHCR (`ubuntu-noble-vanilla:latest`) |

**Rationale**:
- HTTP API is cleaner for Go integration and supports all operations
- CLI fallback handles cases where server isn't running
- Pre-built Ubuntu 24.04 image simplifies setup; customize via cloud-init

**Key Lume Details Discovered**:
- Max 2 concurrent VMs per Mac (kernel limit)
- Default storage: `~/.lume`
- Shared directories via `--shared-dir` flag (not persistent across restarts—must specify each run)
- VM mount point in VM: `/Volumes/My Shared Files`
- Default creds for prebuilt images: `lume:lume`

#### HTTP API Endpoints (Primary)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/vms` | List all VMs |
| `GET` | `/vms/{name}` | Get VM details (state, IP, SSH status) |
| `POST` | `/vms` | Create VM |
| `PUT` | `/vms/{name}` | Modify VM config (CPU, memory, disk) |
| `DELETE` | `/vms/{name}` | Delete VM |
| `POST` | `/vms/{name}/run` | Start VM (with shared dirs) |
| `POST` | `/vms/{name}/stop` | Stop VM |
| `POST` | `/pull` | Pull image from registry |

#### VM State Machine

```
[not exists] --pull/create--> [stopped] --run--> [running]
                                  ^                  |
                                  |      stop        |
                                  +------------------+
                                  |
                              delete (returns to not exists)
```

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 2.1 | Create `internal/vm/client.go` with HTTP client for Lume API | 1.1 | HTTP client can connect to localhost:7777 |
| 2.2 | Implement `List()` - list all VMs | 2.1 | Returns `[]VMDetails` from `/vms` endpoint |
| 2.3 | Implement `Get(name)` - get VM details | 2.1 | Returns VM state, IP, SSH status |
| 2.4 | Implement `Exists(name)` and `IsRunning(name)` helpers | 2.3 | Boolean checks work correctly |
| 2.5 | Implement `Create(opts)` - create VM | 2.1 | Can create VM with CPU/memory/disk settings |
| 2.6 | Implement `Run(name, opts)` - start VM with shared dirs | 2.3 | VM starts, shared dir mounted |
| 2.7 | Implement `Stop(name)` - stop VM | 2.3 | VM stops gracefully |
| 2.8 | Implement `Delete(name)` - delete VM | 2.3 | VM removed from Lume |
| 2.9 | Implement `Set(name, opts)` - modify VM config | 2.3 | Can change CPU/memory when stopped |
| 2.10 | Implement `Pull(image)` - pull image from GHCR | 2.1 | Can pull `ghcr.io/trycua/ubuntu-noble-vanilla:latest` |
| 2.11 | Add CLI fallback for when HTTP API unavailable | 2.1 | Falls back to `lume ... -f json` parsing |
| 2.12 | Implement `WaitForState(name, state, timeout)` | 2.3 | Polls until VM reaches desired state or times out |
| 2.13 | Implement `WaitForSSH(name, timeout)` | 2.12 | Polls until SSH is available |
| 2.14 | Add auto-start of `lume serve` if not running | 2.11 | CLI commands start server automatically |

#### Shared Directory Handling

**Critical discovery**: Shared directories are NOT persistent. Each `lume run` must include:
```json
{
  "sharedDirectories": [
    {"hostPath": "/Users/$USER/super-sandbox/projects", "readOnly": false}
  ]
}
```

The `ss` CLI must always pass the shared dir when starting the VM.

#### Error Mapping

| HTTP Status | Lume Error | Go Error |
|-------------|------------|----------|
| 404 | VM not found | `ErrVMNotFound` |
| 409 | VM already running | `ErrVMRunning` |
| 400 | Invalid config | `ErrInvalidConfig` |

#### Test Strategy

- **Unit tests**: Mock HTTP responses, verify request building
- **Integration tests**: Require Lume installed; create/start/stop/delete a test VM
- **Manual verification**:
  - `lume ls` shows `super-sandbox` VM after create
  - Shared directory accessible from within VM
  - VM state transitions work correctly

#### Open Questions

- **VM name**: Use fixed name `super-sandbox` or configurable? (Recommend: fixed name for simplicity)
- **Image versioning**: Pin to specific tag or use `latest`? (Recommend: pin to specific tag for reproducibility)

---

### Domain 3: SSH & PTY

**Status**: `complete`

#### Technology Choices

| Concern | Library | Rationale |
|---------|---------|-----------|
| SSH client | **golang.org/x/crypto/ssh** | Standard library, full protocol support, built-in multiplexing, native Unix socket forwarding via `ListenUnix()` |
| Terminal handling | **golang.org/x/term** | Standard library, raw mode, terminal size detection |

**Alternatives Considered**:
- **github.com/melbahja/goph**: Simpler API but lacks port forwarding and has limited PTY support. Rejected because we need socket forwarding for the browser bridge.
- **github.com/rgzr/sshtun**: Good for dedicated tunneling but tunnel-focused only—doesn't handle interactive sessions.

#### Key Implementation Patterns

**Connection Configuration:**
```go
config := &ssh.ClientConfig{
    User: "sandbox",
    Auth: []ssh.AuthMethod{
        ssh.Password("sandbox"),  // Default VM credentials
    },
    HostKeyCallback: ssh.InsecureIgnoreHostKey(), // VM is local, ephemeral
    Timeout:         5 * time.Second,
}
client, err := ssh.Dial("tcp", "localhost:2222", config)
```

**Interactive Shell with PTY:**
```go
session, _ := client.NewSession()
defer session.Close()

// Raw mode for local terminal
fd := int(os.Stdin.Fd())
oldState, _ := term.MakeRaw(fd)
defer term.Restore(fd, oldState)

// Get size and request PTY
width, height, _ := term.GetSize(fd)
modes := ssh.TerminalModes{ssh.ECHO: 1, ssh.TTY_OP_ISPEED: 14400, ssh.TTY_OP_OSPEED: 14400}
session.RequestPty("xterm-256color", height, width, modes)

// Connect stdio
session.Stdin = os.Stdin
session.Stdout = os.Stdout
session.Stderr = os.Stderr

// Handle window resize
go handleWindowResize(session, fd)

session.Shell()
session.Wait()
```

**Unix Socket Forwarding (for MCP bridge):**
```go
// Remote forwarding: VM socket → Host socket
listener, _ := client.ListenUnix("/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock")
defer listener.Close()

for {
    remote, _ := listener.Accept()
    go func() {
        local, _ := net.Dial("unix", "/tmp/claude-mcp-browser-bridge-$USER/discovered.sock")
        tunnel(local, remote)
    }()
}
```

**Session Multiplexing:**
- One `ssh.Client` supports multiple concurrent sessions
- Interactive shell, command execution, and port forwarding all share one connection
- Each call to `client.NewSession()` creates a new channel over the multiplexed connection

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 3.1 | Create `internal/ssh/client.go` with connection manager | 2.14 | Can connect to VM at localhost:2222 |
| 3.2 | Implement `Connect(host, port, user, pass)` with timeout | 3.1 | Returns `*ssh.Client` or error with timeout |
| 3.3 | Implement `InteractiveShell(client, workdir, cmd)` | 3.2 | Opens PTY, runs command in workdir |
| 3.4 | Implement terminal raw mode with restore on exit/panic | 3.3 | `defer term.Restore()` pattern works correctly |
| 3.5 | Implement window resize handler (SIGWINCH) | 3.3 | Terminal resize propagates to remote |
| 3.6 | Implement `RunCommand(client, cmd)` for non-interactive commands | 3.2 | Returns stdout, stderr, exit code |
| 3.7 | Implement connection retry with exponential backoff | 3.2 | Retries up to 5 times with backoff |
| 3.8 | Implement `ForwardUnixSocket(client, remoteSocket, localSocket)` | 3.2 | Unix socket forwarding works bidirectionally |
| 3.9 | Implement `ForwardTCPPort(client, remotePort, localPort)` | 3.2 | TCP port forwarding for DevTools fallback |
| 3.10 | Add graceful shutdown handling (close sessions before client) | 3.3 | Clean disconnect on Ctrl+C or exit |
| 3.11 | Create `SessionManager` for tracking active sessions | 3.6 | Can list and close active sessions |

#### Connection Details for Super-Sandbox

| Parameter | Value | Notes |
|-----------|-------|-------|
| Host | `localhost` | Lume VMs accessible via localhost |
| Port | `2222` | Default Lume SSH port |
| User | `sandbox` | Default VM user (from Domain 9) |
| Auth | Password `sandbox` | Default; may change to key-based later |
| Host key | Ignore | VM is local and ephemeral |

#### Important Gotchas

1. **Always restore terminal state**: Use `defer term.Restore(fd, oldState)` immediately after `MakeRaw()`. Use a recover wrapper to ensure restoration even on panic.

2. **session.Signal() is unreliable**: Control characters (`\x03` for Ctrl+C) flow naturally through stdin in raw mode.

3. **One shell per session**: Can't call `Shell()` twice. Create a new session for each concurrent command.

4. **Buffer blocking**: Stdout/stderr share a buffer. Use goroutines if reading both concurrently.

5. **Get terminal size before RequestPty()**: Not after, otherwise size may be wrong.

#### Test Strategy

- **Unit tests**: Mock `ssh.Client` interface, verify connection config building
- **Integration tests**: Require running VM; test connect, shell, command, socket forwarding
- **Manual verification**:
  - Run `ss my-project`, verify interactive shell works
  - Resize terminal window, verify remote responds
  - Ctrl+C in shell, verify signal reaches remote process
  - Exit shell, verify terminal is restored to normal

#### Open Questions

- **Authentication method**: Password is simple but key-based would be more secure. Recommend starting with password for simplicity, then adding key-based auth later if needed.
- **Connection pooling**: Should we keep one persistent connection or connect fresh each time? Recommend fresh connection per `ss <project>` invocation for simplicity.

---

### Domain 4: MCP Socket Bridge

**Status**: `complete`

#### Technology Choices

| Concern | Approach | Rationale |
|---------|----------|-----------|
| Socket Discovery | `filepath.Glob()` + connection test | Handles stale sockets from crashes |
| Tunneling | `ssh.Client.ListenUnix()` | Native Go SSH library method for remote socket forwarding |
| Protocol Handling | Transparent byte tunnel | No MCP protocol parsing needed; JSON-RPC flows through unchanged |
| Multiple Sessions | Forward most recent socket | Host's chrome-native-host handles multiplexing |

**Key Discoveries**:

1. **Socket Path Pattern**: `/tmp/claude-mcp-browser-bridge-$USER/<pid>.sock`
   - Also accessible via `/private/tmp/...` symlink
   - Named with PID of `chrome-native-host` process
   - Directory has `drwx------` permissions (owner only)

2. **chrome-native-host**: Wrapper script at `~/.claude/chrome/chrome-native-host` that execs the Claude Code binary with `--chrome-native-host` flag

3. **MCP Protocol**: JSON-RPC 2.0 over Unix socket. Stateful with request/response/notification message types. **No parsing required**—just tunnel bytes transparently.

4. **Concurrent Access**: The host's chrome-native-host already supports multiple concurrent MCP connections. Multiple Claude Code sessions in VM can share one tunneled socket.

5. **Known Issue**: Go's `ListenUnix()` has a race condition between sending forward request and being ready. Mitigate with small delay after establishing listener.

#### Socket Discovery Algorithm

```go
func discoverMCPSocket() (string, error) {
    user := os.Getenv("USER")
    pattern := fmt.Sprintf("/tmp/claude-mcp-browser-bridge-%s/*.sock", user)

    matches, err := filepath.Glob(pattern)
    if err != nil || len(matches) == 0 {
        return "", ErrNoSocketFound
    }

    // Sort by modification time (most recent first)
    sort.Slice(matches, func(i, j int) bool {
        statI, _ := os.Stat(matches[i])
        statJ, _ := os.Stat(matches[j])
        return statI.ModTime().After(statJ.ModTime())
    })

    // Test connectivity to find live socket
    for _, sock := range matches {
        conn, err := net.DialTimeout("unix", sock, 1*time.Second)
        if err == nil {
            conn.Close()
            return sock, nil
        }
    }

    return "", ErrNoActiveSocket
}
```

#### Socket Forwarding Implementation

```go
func ForwardMCPSocket(client *ssh.Client, hostSocket, vmSocket string) error {
    // Ensure VM socket directory exists (via SSH command)
    session, _ := client.NewSession()
    session.Run("mkdir -p " + filepath.Dir(vmSocket) + " && chmod 700 " + filepath.Dir(vmSocket))
    session.Close()

    // Create listening socket on remote (VM) side
    listener, err := client.ListenUnix(vmSocket)
    if err != nil {
        return fmt.Errorf("failed to create remote socket: %w", err)
    }

    // Mitigate ListenUnix race condition
    time.Sleep(100 * time.Millisecond)

    go func() {
        defer listener.Close()
        for {
            remote, err := listener.Accept()
            if err != nil {
                return // Listener closed
            }
            go tunnelSocket(hostSocket, remote)
        }
    }()

    return nil
}

func tunnelSocket(hostSocket string, remote net.Conn) {
    defer remote.Close()

    local, err := net.Dial("unix", hostSocket)
    if err != nil {
        return
    }
    defer local.Close()

    done := make(chan struct{}, 2)
    go func() { io.Copy(local, remote); done <- struct{}{} }()
    go func() { io.Copy(remote, local); done <- struct{}{} }()
    <-done
}
```

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 4.1 | Create `internal/browser/mcp.go` with socket discovery | 1.1 | Can find MCP socket on host |
| 4.2 | Implement `DiscoverMCPSocket()` with glob + mtime sort | 4.1 | Returns most recent socket path |
| 4.3 | Add connectivity test to filter stale sockets | 4.2 | Only returns sockets that accept connections |
| 4.4 | Implement `ForwardMCPSocket(client, hostSock, vmSock)` | 3.8 | Creates remote socket, tunnels to host |
| 4.5 | Create VM socket directory with proper permissions | 4.4 | Directory exists with `0700` permissions |
| 4.6 | Implement bidirectional tunnel (`io.Copy` pattern) | 4.4 | Bytes flow transparently both directions |
| 4.7 | Add ListenUnix race condition mitigation | 4.4 | Small delay after listener creation |
| 4.8 | Implement `ValidateBrowserBridge()` preflight check | 4.1 | Checks: claude installed, socket exists, socket live |
| 4.9 | Add user-friendly error messages for common failures | 4.8 | Clear guidance when socket not found |
| 4.10 | Integrate socket forwarding into main connect flow | 4.4, 3.3 | `ss <project>` establishes tunnel before Claude Code starts |

#### VM Socket Path

Use a fixed, well-known path in the VM:

```
/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock
```

Claude Code in VM connects to this path. The `ss` CLI manages which host socket it tunnels to.

#### Validation Flow

Before establishing the tunnel, validate:

1. **Claude Code installed**: Check `~/.claude/chrome/chrome-native-host` exists
2. **Socket directory exists**: Check `/tmp/claude-mcp-browser-bridge-$USER/` exists
3. **Live socket found**: At least one socket passes connectivity test
4. **Chrome running**: Implicitly validated by socket connectivity

If validation fails, show helpful error:

```
╭───────────────────────────────────────────────────────────────────────╮
│  Browser Bridge Not Available                                          │
│                                                                        │
│  No active Claude Code MCP socket found.                              │
│                                                                        │
│  To enable browser automation:                                         │
│    1. Run 'claude --chrome' on your Mac                               │
│    2. Keep it running in the background                                │
│    3. Then run 'ss <project>' again                                   │
│                                                                        │
│  Note: Browser automation requires Chrome and the Claude in Chrome    │
│  extension to be installed and running.                               │
╰───────────────────────────────────────────────────────────────────────╯
```

#### Test Strategy

- **Unit tests**:
  - Socket discovery with mock filesystem (inject test sockets)
  - Validation logic with various failure scenarios
- **Integration tests**:
  - Create test socket, verify discovery finds it
  - Establish tunnel, send test bytes, verify they arrive
- **Manual verification**:
  - Run `claude --chrome` on host
  - Run `ss my-project` and verify Claude Code can use browser tools
  - Close host Claude Code, verify helpful error message

#### Open Questions

None—the implementation path is clear. The key insight is that we tunnel transparently without parsing MCP protocol.

#### Cross-Domain Dependencies

- **Uses Domain 3**: `ForwardUnixSocket` capability from SSH & PTY domain
- **Used by Domain 5**: DevTools fallback triggers when MCP socket not found

---

### Domain 5: DevTools Fallback

**Status**: `deferred to v2`

> **Simplification Decision**: Skip DevTools fallback for v1. Focus on MCP socket bridge as the single browser automation method. If MCP bridge works (as it does for Claude Cowork), fallback is unnecessary complexity.

#### Technology Choices

| Concern | Approach | Rationale |
|---------|----------|-----------|
| CDP Detection | HTTP GET `http://localhost:9222/json/version` | Standard endpoint; returns JSON with `webSocketDebuggerUrl` if available |
| Port Forwarding | `ssh.Client.Dial()` for local forwarding | Built into Go SSH library; simpler than socket forwarding |
| MCP Server | `chrome-devtools-mcp` (npx) | Official Google package; pre-configured in VM image |
| Fallback Trigger | After MCP socket discovery fails | Sequential fallback (try primary → then DevTools) |

**Key Discoveries**:

1. **Detection Endpoint**: Chrome exposes `http://localhost:9222/json/version` when `--remote-debugging-port=9222` is set. Response includes browser info and `webSocketDebuggerUrl`.

2. **chrome-devtools-mcp**: Official Google MCP server released Sept 2025. Supports `--browserUrl http://127.0.0.1:9222` to connect to existing Chrome. Requires Node.js v20.19+.

3. **Port Reuse Problem**: Chrome ignores `--remote-debugging-port` if any Chrome process is already running. Users must either:
   - Close all Chrome windows before starting debug Chrome, OR
   - Use a separate `--user-data-dir` to force a new process

4. **Security**: Debug port bound to localhost only by default. Safe as long as we don't use `--remote-debugging-address=0.0.0.0`.

5. **Local Port Forwarding Pattern**: Unlike the reverse socket forwarding in Domain 4, this uses local forwarding: VM's localhost:9222 → Host's localhost:9222. The Go pattern is simpler:
   ```go
   // Listen locally in VM
   listener, _ := net.Listen("tcp", "localhost:9222")
   for {
       local, _ := listener.Accept()
       // Connect through SSH to host's port 9222
       remote, _ := sshClient.Dial("tcp", "localhost:9222")
       go tunnel(local, remote)
   }
   ```

#### Chrome Launch Helper

The `ss` CLI provides a helper script for users to start Chrome with debugging:

```bash
# ~/super-sandbox/start-chrome-debug.sh
#!/bin/bash
# Start Chrome with remote debugging enabled
# Uses a separate profile to avoid conflicts with existing Chrome

USER_DATA_DIR="$HOME/.super-sandbox/chrome-debug-profile"
mkdir -p "$USER_DATA_DIR"

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --remote-debugging-port=9222 \
    --user-data-dir="$USER_DATA_DIR" \
    "$@"
```

**Important**: The `--user-data-dir` flag ensures a new Chrome process starts even if Chrome is already running. Login sessions must be set up in this debug profile.

#### CDP Detection Implementation

```go
type CDPVersionResponse struct {
    Browser              string `json:"Browser"`
    ProtocolVersion      string `json:"Protocol-Version"`
    UserAgent            string `json:"User-Agent"`
    WebSocketDebuggerUrl string `json:"webSocketDebuggerUrl"`
}

func DetectChromeDebugPort() (*CDPVersionResponse, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    req, _ := http.NewRequestWithContext(ctx, "GET", "http://localhost:9222/json/version", nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, ErrChromeDebugNotAvailable
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return nil, ErrChromeDebugNotAvailable
    }

    var version CDPVersionResponse
    if err := json.NewDecoder(resp.Body).Decode(&version); err != nil {
        return nil, fmt.Errorf("invalid CDP response: %w", err)
    }

    return &version, nil
}
```

#### TCP Port Forwarding Implementation

```go
func ForwardTCPPort(client *ssh.Client, localPort, remotePort int) (net.Listener, error) {
    localAddr := fmt.Sprintf("localhost:%d", localPort)
    remoteAddr := fmt.Sprintf("localhost:%d", remotePort)

    listener, err := net.Listen("tcp", localAddr)
    if err != nil {
        return nil, fmt.Errorf("failed to listen on %s: %w", localAddr, err)
    }

    go func() {
        for {
            local, err := listener.Accept()
            if err != nil {
                return // Listener closed
            }
            go func() {
                defer local.Close()
                remote, err := client.Dial("tcp", remoteAddr)
                if err != nil {
                    return
                }
                defer remote.Close()

                done := make(chan struct{}, 2)
                go func() { io.Copy(remote, local); done <- struct{}{} }()
                go func() { io.Copy(local, remote); done <- struct{}{} }()
                <-done
            }()
        }
    }()

    return listener, nil
}
```

#### Fallback Detection Flow

```go
func (c *Connector) SetupBrowserIntegration(sshClient *ssh.Client) (BrowserMethod, error) {
    // 1. Try primary method: MCP socket tunneling
    hostSocket, err := DiscoverMCPSocket()
    if err == nil {
        if err := ForwardMCPSocket(sshClient, hostSocket, vmMCPSocket); err == nil {
            return BrowserMethodMCP, nil
        }
    }

    // 2. Try fallback: Chrome DevTools Protocol
    _, err = DetectChromeDebugPort()
    if err == nil {
        _, err := ForwardTCPPort(sshClient, 9222, 9222)
        if err == nil {
            return BrowserMethodDevTools, nil
        }
    }

    // 3. Neither available
    return BrowserMethodNone, ErrNoBrowserIntegration
}
```

#### VM Configuration for DevTools Fallback

The VM image includes pre-configured chrome-devtools-mcp as an MCP server for Claude Code:

```bash
# Pre-run in VM image build (Domain 9)
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest \
    --browserUrl http://127.0.0.1:9222 \
    --no-usage-statistics
```

This configures Claude Code to use the DevTools MCP server when browser tools are invoked. The `--browserUrl` points to the forwarded port.

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 5.1 | Create `internal/browser/devtools.go` | 1.1 | File exists with package structure |
| 5.2 | Implement `DetectChromeDebugPort()` HTTP check | 5.1 | Returns CDP version info or error |
| 5.3 | Add timeout and error handling to detection | 5.2 | 2-second timeout, meaningful errors |
| 5.4 | Implement `ForwardTCPPort(client, local, remote)` | 3.2 | TCP tunnel works bidirectionally |
| 5.5 | Create helper script `start-chrome-debug.sh` | - | Script installed to `~/super-sandbox/` |
| 5.6 | Implement `SetupBrowserIntegration()` with fallback logic | 4.8, 5.2 | Tries MCP first, then DevTools |
| 5.7 | Add user-facing messages for each browser method | 5.6 | Clear indication of which method active |
| 5.8 | Add error messages when neither method available | 5.6 | Helpful guidance for user setup |
| 5.9 | Configure chrome-devtools-mcp in VM image | - | VM image task (Domain 9 dependency) |
| 5.10 | Integration test: full fallback flow | 5.6 | Verify fallback triggers correctly |

#### User-Facing Messages

**When MCP socket works (primary):**
```
Browser: Connected (Claude in Chrome)
```

**When DevTools fallback activates:**
```
Browser: Connected (Chrome DevTools)
  Note: Using fallback mode. For seamless experience,
  run 'claude --chrome' on your Mac.
```

**When neither works:**
```
╭───────────────────────────────────────────────────────────────────────╮
│  Browser Integration Unavailable                                        │
│                                                                        │
│  Neither browser automation method is available.                       │
│                                                                        │
│  Option 1 (Recommended):                                               │
│    Run 'claude --chrome' on your Mac and keep it running               │
│                                                                        │
│  Option 2 (DevTools Fallback):                                         │
│    Run '~/super-sandbox/start-chrome-debug.sh'                         │
│    Note: This uses a separate Chrome profile                           │
│                                                                        │
│  Then run 'ss <project>' again.                                        │
╰───────────────────────────────────────────────────────────────────────╯
```

**When DevTools detected but Chrome profile needs setup:**
```
╭───────────────────────────────────────────────────────────────────────╮
│  Chrome DevTools Fallback Active                                        │
│                                                                        │
│  Connected to Chrome debug port.                                       │
│                                                                        │
│  Note: This uses a separate Chrome profile at:                         │
│    ~/.super-sandbox/chrome-debug-profile                               │
│                                                                        │
│  You may need to log into websites in this browser window.             │
│  Your sessions will persist between runs.                              │
╰───────────────────────────────────────────────────────────────────────╯
```

#### Test Strategy

- **Unit tests**:
  - `DetectChromeDebugPort()` with mock HTTP server returning valid/invalid JSON
  - Fallback logic with mocked MCP and DevTools detection
  - Error message generation for various states
- **Integration tests**:
  - Start Chrome with `--remote-debugging-port=9222`, verify detection works
  - Verify TCP forwarding with test server
  - Full fallback flow with real VM (requires Lume)
- **Manual verification**:
  - Kill any `claude --chrome` process, verify DevTools fallback activates
  - Run with DevTools Chrome, verify browser automation works
  - Run with neither, verify helpful error message

#### Open Questions

None—the fallback pattern is straightforward. Key insight: we don't need to parse CDP protocol, just forward the TCP port and let `chrome-devtools-mcp` handle the protocol.

#### Cross-Domain Dependencies

- **Depends on Domain 3**: Uses `ssh.Client.Dial()` for TCP forwarding (simpler than socket forwarding)
- **Depends on Domain 4**: Fallback triggers after MCP socket discovery fails
- **Feeds into Domain 9**: VM image must pre-configure chrome-devtools-mcp with correct `--browserUrl`

---

### Domain 6: Project Management

**Status**: `complete`

#### Technology Choices

| Concern | Library/Approach | Rationale |
|---------|------------------|-----------|
| File Operations | Go standard library (`os`, `filepath`) | `os.MkdirAll`, `os.WriteFile`, `os.ReadDir` cover all needs; no external deps |
| Template Storage | `embed` package with `//go:embed` | Templates compiled into binary; no external files to manage |
| Git Initialization | `exec.Command("git", "init")` | Simpler than go-git; git is required anyway for dev work |
| Metadata Storage | JSON file (`.ss/metadata.json`) | Human-readable, standard Go `encoding/json` |
| GitHub Integration | `exec.Command("gh", "repo", "create")` | gh CLI handles auth, org permissions; proven UX |

**Alternatives Considered**:

1. **go-git vs exec.Command for git**:
   - go-git is a pure Go implementation, but adds dependency and complexity
   - `git init` is a single command we call once per project; exec is simpler
   - Users have git installed (required for development anyway)
   - Decision: Use `exec.Command("git", "init")` for simplicity

2. **Template system (text/template vs static embed)**:
   - `text/template` allows variable substitution but adds complexity
   - Templates are mostly static with only `{{.ProjectName}}` substitution
   - Decision: Use `embed.FS` with simple string replacement for project name

3. **Metadata format (JSON vs YAML)**:
   - Both work; JSON is built into Go stdlib without external deps
   - Metadata is machine-read, not human-edited
   - Decision: JSON with `encoding/json`

#### Project Structure (on disk)

```
~/super-sandbox/projects/<name>/
├── .git/                    # Git repository
├── .ss/
│   └── metadata.json        # Project metadata (gitignored)
├── .gitignore               # Standard ignores
├── AGENTS.md                # Agent instructions template
└── README.md                # Project readme template
```

#### Template Embedding

```go
package project

import "embed"

//go:embed templates/*
var templateFS embed.FS

// Templates:
// - templates/AGENTS.md
// - templates/README.md
// - templates/gitignore (stored without dot prefix)
```

#### AGENTS.md Template

```markdown
# AGENTS.md

Instructions for AI coding agents working on this project.

## Project Overview

{{.ProjectName}} - [Describe your project here]

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

Deploy to Vercel:

```bash
vercel
```

## Guidelines

- [Project-specific guidelines]
```

#### README.md Template

```markdown
# {{.ProjectName}}

[Project description]

## Development

Created with [Super-Sandbox](https://github.com/anthropics/super-sandbox).

### Local (Sandboxed)

```bash
ss {{.ProjectName}}
```

### Claude Code Web

Open this repository in [Claude Code Web](https://claude.ai/code).
```

#### .gitignore Template

```
# Super-Sandbox metadata
.ss/

# Common ignores
.DS_Store
.env
.env.local
node_modules/
dist/
build/
*.log
```

#### Metadata Structure

```go
type ProjectMetadata struct {
    Created      time.Time `json:"created"`
    LastAccessed time.Time `json:"lastAccessed"`
    GitHubRepo   string    `json:"githubRepo,omitempty"` // e.g., "username/project-name"
}
```

Stored at `.ss/metadata.json`:
```json
{
  "created": "2025-01-15T10:30:00Z",
  "lastAccessed": "2025-01-15T14:22:00Z",
  "githubRepo": "username/my-project"
}
```

#### Project Manager Interface

```go
package project

type Manager struct {
    baseDir string // ~/super-sandbox/projects
}

func NewManager(baseDir string) *Manager
func (m *Manager) Create(name string, opts CreateOptions) (*Project, error)
func (m *Manager) List() ([]Project, error)
func (m *Manager) Get(name string) (*Project, error)
func (m *Manager) Delete(name string) error
func (m *Manager) UpdateLastAccessed(name string) error
func (m *Manager) Exists(name string) bool
func (m *Manager) ProjectPath(name string) string

type CreateOptions struct {
    CreateGitHubRepo bool
    GitHubPrivate    bool // default false (public)
}

type Project struct {
    Name     string
    Path     string
    Metadata ProjectMetadata
}
```

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 6.1 | Create `internal/project/project.go` with types | 1.1 | Types compile, package imports |
| 6.2 | Implement `NewManager(baseDir)` constructor | 6.1 | Creates manager, validates base dir exists |
| 6.3 | Create `internal/project/templates/` with embedded files | 6.1 | `//go:embed` directive works, files accessible |
| 6.4 | Implement `Create(name, opts)` - directory + templates | 6.2, 6.3 | Creates project dir, writes templated files |
| 6.5 | Implement git initialization via `exec.Command` | 6.4 | `.git/` directory created with initial commit |
| 6.6 | Implement metadata creation and loading | 6.4 | `.ss/metadata.json` created and parseable |
| 6.7 | Implement `List()` - scan projects directory | 6.2 | Returns all projects with metadata |
| 6.8 | Implement `Get(name)` - load single project | 6.6 | Returns project with metadata or error |
| 6.9 | Implement `Delete(name)` with safety checks | 6.2 | Removes project dir after confirmation |
| 6.10 | Implement `UpdateLastAccessed(name)` | 6.6 | Updates metadata timestamp |
| 6.11 | Implement `CreateGitHubRepo()` via gh CLI | 6.5 | Creates remote repo, sets origin |
| 6.12 | Add project name validation | 6.1 | Rejects invalid names (spaces, special chars) |
| 6.13 | Wire up CLI commands (`ss new`, `ss list`, `ss delete`) | 6.4-6.9 | Commands work end-to-end |

#### Project Name Validation

Valid project names:
- Lowercase letters, numbers, hyphens only
- Must start with letter
- 2-50 characters
- No consecutive hyphens
- Matches: `^[a-z][a-z0-9-]{1,49}$` (with no `--`)

```go
var validNameRegex = regexp.MustCompile(`^[a-z][a-z0-9-]{1,49}$`)

func ValidateProjectName(name string) error {
    if !validNameRegex.MatchString(name) {
        return ErrInvalidProjectName
    }
    if strings.Contains(name, "--") {
        return ErrInvalidProjectName
    }
    return nil
}
```

#### Git Initialization

```go
func initGit(projectPath string) error {
    // Initialize repo
    cmd := exec.Command("git", "init")
    cmd.Dir = projectPath
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("git init failed: %w", err)
    }

    // Set default branch to main
    cmd = exec.Command("git", "branch", "-M", "main")
    cmd.Dir = projectPath
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("git branch failed: %w", err)
    }

    // Initial commit
    cmd = exec.Command("git", "add", ".")
    cmd.Dir = projectPath
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("git add failed: %w", err)
    }

    cmd = exec.Command("git", "commit", "-m", "Initial commit from Super-Sandbox")
    cmd.Dir = projectPath
    cmd.Env = append(os.Environ(),
        "GIT_AUTHOR_NAME=Super-Sandbox",
        "GIT_AUTHOR_EMAIL=noreply@supersandbox.dev",
        "GIT_COMMITTER_NAME=Super-Sandbox",
        "GIT_COMMITTER_EMAIL=noreply@supersandbox.dev",
    )
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("git commit failed: %w", err)
    }

    return nil
}
```

#### GitHub Repo Creation

```go
func createGitHubRepo(projectPath, name string, private bool) (string, error) {
    // Check if gh is authenticated
    checkCmd := exec.Command("gh", "auth", "status")
    if err := checkCmd.Run(); err != nil {
        return "", fmt.Errorf("gh not authenticated: run 'gh auth login' first")
    }

    // Build args
    args := []string{"repo", "create", name, "--source=.", "--remote=origin"}
    if private {
        args = append(args, "--private")
    } else {
        args = append(args, "--public")
    }

    cmd := exec.Command("gh", args...)
    cmd.Dir = projectPath
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "", fmt.Errorf("gh repo create failed: %s", output)
    }

    // Get repo URL
    urlCmd := exec.Command("gh", "repo", "view", "--json", "url", "-q", ".url")
    urlCmd.Dir = projectPath
    urlOutput, err := urlCmd.Output()
    if err != nil {
        return "", fmt.Errorf("failed to get repo URL: %w", err)
    }

    return strings.TrimSpace(string(urlOutput)), nil
}
```

#### Error Types

```go
var (
    ErrProjectExists       = errors.New("project already exists")
    ErrProjectNotFound     = errors.New("project not found")
    ErrInvalidProjectName  = errors.New("invalid project name: use lowercase letters, numbers, and hyphens only")
    ErrGitNotInstalled     = errors.New("git is not installed")
    ErrGhNotAuthenticated  = errors.New("gh CLI not authenticated: run 'gh auth login'")
)
```

#### Test Strategy

- **Unit tests**:
  - Template rendering with various project names
  - Project name validation (valid/invalid cases)
  - Metadata JSON serialization/deserialization
  - Path construction
- **Integration tests**:
  - Full `Create()` flow with temp directory
  - `List()` with multiple projects
  - `Delete()` removes all files
  - Git initialization produces valid repo
- **Manual verification**:
  - `ss new my-project` creates correct file structure
  - `ss list` shows projects with correct metadata
  - `ss delete my-project` removes directory
  - `ss new my-project --github` creates repo and sets remote

#### Open Questions

None—the approach is straightforward. Key decisions:
1. Use exec for git (simpler than go-git for our needs)
2. Use exec for gh CLI (handles auth complexity)
3. JSON metadata (stdlib, human-readable for debugging)

#### Cross-Domain Dependencies

- **Used by Domain 1 (CLI)**: CLI commands (`ss new`, `ss list`, `ss delete`) call project manager
- **Uses exec for git/gh**: Requires git and gh installed (documented in installation requirements)
- **Independent of VM**: Project management happens on host filesystem

---

### Domain 7: Configuration

**Status**: `complete`

#### Technology Choices

| Concern | Library/Approach | Rationale |
|---------|------------------|-----------|
| YAML Parsing | `gopkg.in/yaml.v3` | Standard, well-maintained, struct tag support for clean mappings |
| Environment Variables | Go standard library (`os.Getenv`) | Three env vars, no framework needed |
| Validation | Custom struct methods | Simple rules, no external validator deps |
| Config File Location | Fixed at `~/super-sandbox/config.yaml` | Single source of truth, matches project location convention |
| Default Values | Struct initialization | Defaults baked into Go types, applied before file load |

**Alternatives Considered**:

1. **Viper vs yaml.v3 direct**:
   - Viper is powerful but overkill: adds 10+ transitive deps for features we don't need (remote config, multiple file types, watch, pflag integration)
   - Our config is simple: one YAML file with ~6 settings
   - yaml.v3 gives us everything: struct marshaling, custom tags, good errors
   - Decision: Use `gopkg.in/yaml.v3` directly

2. **koanf vs yaml.v3 direct**:
   - koanf is lighter than Viper but still adds abstraction layers
   - Provider/parser architecture adds complexity for single-file config
   - Decision: yaml.v3 is simpler for our needs

3. **Validation library (go-playground/validator) vs custom**:
   - go-playground/validator is powerful but adds dependencies
   - Our validation is simple: numeric ranges, string patterns
   - Custom validation methods are clear and have zero deps
   - Decision: Custom `Validate()` methods on config structs

#### Configuration File Structure

Location: `~/super-sandbox/config.yaml` (or `$SS_HOME/config.yaml` if set)

```yaml
# Configuration version for future migrations
version: 1

# VM resource allocation
vm:
  cpus: 4           # 2-8 cores
  memory: 8GB       # 4GB-32GB, human-readable format
  disk: 100GB       # 20GB-500GB, grows dynamically

# Update behavior
updates:
  check: true       # Check for updates on launch
  auto_apply: true  # Apply without prompting
```

#### Go Types

```go
package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

// Config represents the root configuration
type Config struct {
	Version int           `yaml:"version"`
	VM      VMConfig      `yaml:"vm"`
	Updates UpdatesConfig `yaml:"updates"`
}

// VMConfig contains virtual machine resource settings
type VMConfig struct {
	CPUs   int    `yaml:"cpus"`
	Memory string `yaml:"memory"` // Human-readable: "8GB"
	Disk   string `yaml:"disk"`   // Human-readable: "100GB"
}

// UpdatesConfig contains auto-update settings
type UpdatesConfig struct {
	Check     bool `yaml:"check"`
	AutoApply bool `yaml:"auto_apply"`
}
```

#### Default Values

```go
// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		Version: 1,
		VM: VMConfig{
			CPUs:   4,
			Memory: "8GB",
			Disk:   "100GB",
		},
		Updates: UpdatesConfig{
			Check:     true,
			AutoApply: true,
		},
	}
}
```

#### Environment Variable Overrides

| Variable | Purpose | Default |
|----------|---------|---------|
| `SS_HOME` | Override base directory (config + projects) | `~/super-sandbox` |
| `SS_NO_UPDATE` | Disable update checks when set to any value | unset |
| `SS_DEBUG` | Enable debug logging when set to any value | unset |

```go
// GetBaseDir returns the Super-Sandbox base directory
func GetBaseDir() string {
	if dir := os.Getenv("SS_HOME"); dir != "" {
		return dir
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "super-sandbox")
}

// GetConfigPath returns the full path to config.yaml
func GetConfigPath() string {
	return filepath.Join(GetBaseDir(), "config.yaml")
}

// UpdatesEnabled returns true unless SS_NO_UPDATE is set
func UpdatesEnabled() bool {
	return os.Getenv("SS_NO_UPDATE") == ""
}

// DebugEnabled returns true if SS_DEBUG is set
func DebugEnabled() bool {
	return os.Getenv("SS_DEBUG") != ""
}
```

#### Memory/Disk Size Parsing

Human-readable sizes like "8GB" need to be parsed to bytes for Lume:

```go
var sizeRegex = regexp.MustCompile(`^(\d+)(GB|MB|TB)$`)

// ParseSize converts "8GB" to bytes
func ParseSize(s string) (int64, error) {
	s = strings.ToUpper(strings.TrimSpace(s))
	matches := sizeRegex.FindStringSubmatch(s)
	if matches == nil {
		return 0, fmt.Errorf("invalid size format: %q (expected e.g., '8GB')", s)
	}

	value, _ := strconv.ParseInt(matches[1], 10, 64)
	unit := matches[2]

	multipliers := map[string]int64{
		"MB": 1024 * 1024,
		"GB": 1024 * 1024 * 1024,
		"TB": 1024 * 1024 * 1024 * 1024,
	}

	return value * multipliers[unit], nil
}

// FormatSize converts bytes to human-readable "8GB"
func FormatSize(bytes int64) string {
	const gb = 1024 * 1024 * 1024
	return fmt.Sprintf("%dGB", bytes/gb)
}
```

#### Validation

```go
var (
	ErrInvalidVersion    = errors.New("config version must be 1")
	ErrInvalidCPUs       = errors.New("cpus must be between 2 and 8")
	ErrInvalidMemory     = errors.New("memory must be between 4GB and 32GB")
	ErrInvalidDisk       = errors.New("disk must be between 20GB and 500GB")
	ErrInvalidSizeFormat = errors.New("size must be in format like '8GB'")
)

// Validate checks the configuration for errors
func (c *Config) Validate() error {
	if c.Version != 1 {
		return ErrInvalidVersion
	}

	if err := c.VM.Validate(); err != nil {
		return fmt.Errorf("vm: %w", err)
	}

	return nil
}

// Validate checks VM configuration
func (v *VMConfig) Validate() error {
	// CPUs: 2-8
	if v.CPUs < 2 || v.CPUs > 8 {
		return ErrInvalidCPUs
	}

	// Memory: 4GB-32GB
	memBytes, err := ParseSize(v.Memory)
	if err != nil {
		return ErrInvalidSizeFormat
	}
	minMem := int64(4) * 1024 * 1024 * 1024  // 4GB
	maxMem := int64(32) * 1024 * 1024 * 1024 // 32GB
	if memBytes < minMem || memBytes > maxMem {
		return ErrInvalidMemory
	}

	// Disk: 20GB-500GB
	diskBytes, err := ParseSize(v.Disk)
	if err != nil {
		return ErrInvalidSizeFormat
	}
	minDisk := int64(20) * 1024 * 1024 * 1024  // 20GB
	maxDisk := int64(500) * 1024 * 1024 * 1024 // 500GB
	if diskBytes < minDisk || diskBytes > maxDisk {
		return ErrInvalidDisk
	}

	return nil
}
```

#### Config Manager

```go
package config

type Manager struct {
	path   string
	config *Config
}

// NewManager creates a config manager for the given path
func NewManager(path string) *Manager {
	return &Manager{
		path:   path,
		config: DefaultConfig(),
	}
}

// Load reads config from disk, using defaults for missing values
func (m *Manager) Load() error {
	data, err := os.ReadFile(m.path)
	if os.IsNotExist(err) {
		// No config file yet; use defaults
		return nil
	}
	if err != nil {
		return fmt.Errorf("read config: %w", err)
	}

	// Parse YAML into existing config (preserving defaults for missing keys)
	if err := yaml.Unmarshal(data, m.config); err != nil {
		return fmt.Errorf("parse config: %w", err)
	}

	// Validate loaded config
	if err := m.config.Validate(); err != nil {
		return fmt.Errorf("invalid config: %w", err)
	}

	return nil
}

// Save writes the current config to disk
func (m *Manager) Save() error {
	// Ensure directory exists
	dir := filepath.Dir(m.path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}

	data, err := yaml.Marshal(m.config)
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}

	// Add header comment
	header := "# Super-Sandbox configuration\n# See: https://github.com/anthropics/super-sandbox\n\n"
	data = append([]byte(header), data...)

	if err := os.WriteFile(m.path, data, 0644); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	return nil
}

// Get returns the current configuration (read-only)
func (m *Manager) Get() Config {
	return *m.config
}

// SetVMCPUs updates CPU count and saves
func (m *Manager) SetVMCPUs(cpus int) error {
	m.config.VM.CPUs = cpus
	if err := m.config.Validate(); err != nil {
		return err
	}
	return m.Save()
}

// SetVMMemory updates memory and saves
func (m *Manager) SetVMMemory(memory string) error {
	m.config.VM.Memory = memory
	if err := m.config.Validate(); err != nil {
		return err
	}
	return m.Save()
}

// SetVMDisk updates disk size and saves
func (m *Manager) SetVMDisk(disk string) error {
	m.config.VM.Disk = disk
	if err := m.config.Validate(); err != nil {
		return err
	}
	return m.Save()
}

// SetUpdatesCheck enables/disables update checks
func (m *Manager) SetUpdatesCheck(check bool) error {
	m.config.Updates.Check = check
	return m.Save()
}

// SetUpdatesAutoApply enables/disables auto-apply
func (m *Manager) SetUpdatesAutoApply(autoApply bool) error {
	m.config.Updates.AutoApply = autoApply
	return m.Save()
}
```

#### CLI Integration

The `ss config` command uses the config manager:

```go
// cmd/config.go (partial)
func runConfigSet(args []string) error {
	if len(args) != 2 {
		return fmt.Errorf("usage: ss config set <key> <value>")
	}

	mgr := config.NewManager(config.GetConfigPath())
	if err := mgr.Load(); err != nil {
		return err
	}

	key, value := args[0], args[1]

	switch key {
	case "cpus":
		cpus, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("cpus must be a number")
		}
		if err := mgr.SetVMCPUs(cpus); err != nil {
			return err
		}
		fmt.Printf("CPUs set to %d. Restart VM to apply.\n", cpus)

	case "memory":
		if err := mgr.SetVMMemory(value); err != nil {
			return err
		}
		fmt.Printf("Memory set to %s. Restart VM to apply.\n", value)

	case "disk":
		if err := mgr.SetVMDisk(value); err != nil {
			return err
		}
		fmt.Printf("Disk set to %s. Restart VM to apply.\n", value)

	default:
		return fmt.Errorf("unknown config key: %s\n\nValid keys: cpus, memory, disk", key)
	}

	return nil
}
```

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 7.1 | Create `internal/config/config.go` with types | 1.1 | Types compile, yaml tags work |
| 7.2 | Implement `DefaultConfig()` | 7.1 | Returns valid defaults |
| 7.3 | Implement `ParseSize()` and `FormatSize()` | 7.1 | "8GB" ↔ bytes conversion works |
| 7.4 | Implement `Config.Validate()` | 7.3 | Catches invalid values with clear errors |
| 7.5 | Implement `VMConfig.Validate()` | 7.3, 7.4 | Validates ranges for cpus/memory/disk |
| 7.6 | Create `internal/config/manager.go` | 7.1 | Manager struct exists |
| 7.7 | Implement `Manager.Load()` | 7.4, 7.6 | Reads YAML, applies defaults, validates |
| 7.8 | Implement `Manager.Save()` | 7.6 | Writes YAML with header comment |
| 7.9 | Implement `Manager.Set*()` methods | 7.7, 7.8 | Each setter validates and saves |
| 7.10 | Implement env var helpers (`GetBaseDir`, etc.) | 7.1 | SS_HOME, SS_NO_UPDATE, SS_DEBUG work |
| 7.11 | Wire up `ss config` command | 7.9 | `ss config set cpus 8` works end-to-end |
| 7.12 | Wire up `ss config` interactive menu | 7.9 | Menu displays/edits settings |

#### Test Strategy

- **Unit tests**:
  - `ParseSize()`: valid inputs ("8GB", "4MB", "1TB"), invalid inputs ("8G", "GB8", "")
  - `FormatSize()`: round-trip with ParseSize
  - `Config.Validate()`: valid config, each invalid field triggers correct error
  - `Manager.Load()`: missing file uses defaults, valid file loads correctly, invalid file returns error
  - `Manager.Save()`: creates directory if needed, writes valid YAML
- **Integration tests**:
  - Full load/modify/save cycle with temp directory
  - Environment variable overrides (SS_HOME)
  - CLI `ss config set` commands
- **Manual verification**:
  - `ss config` shows current settings
  - `ss config set memory 16GB` updates config.yaml
  - Invalid values show helpful error messages

#### Open Questions

None. The design is straightforward:
1. yaml.v3 for parsing (proven, minimal deps)
2. Struct-based config with validation methods
3. Manager pattern for load/save operations
4. Three env vars for overrides

#### Cross-Domain Dependencies

- **Used by Domain 2 (Lume)**: VM resources (cpus, memory, disk) passed to Lume on VM start
- **Used by Domain 6 (Project Management)**: `GetBaseDir()` provides projects directory path
- **Used by Domain 8 (Distribution)**: Update settings (`check`, `auto_apply`) control update behavior

---

### Domain 8: Distribution

**Status**: `complete` (simplified)

> **Simplification Decision**: Skip self-update for v1. Users update via `brew upgrade` or re-running the install script. Auto-update adds complexity and security surface area - revisit in v2.

#### Technology Choices

| Concern | Library/Tool | Version |
|---------|--------------|---------|
| Release automation | **GoReleaser** | v2.x |
| Checksum | SHA256 (GoReleaser built-in) | - |
| Homebrew | GoReleaser `brews` integration | - |
| Self-update | **Deferred to v2** | - |
| Code signing | **Deferred to v2** | - |

**Rationale**:
- **GoReleaser v2**: Industry standard for Go releases. Handles cross-compilation, universal binaries, checksums, GitHub releases, and Homebrew formula generation in one config file.
- **No self-update for v1**: Users update manually via Homebrew or install script. Simpler, more predictable.
- **Universal binaries**: Single fat binary for macOS (Intel + Apple Silicon) simplifies distribution.

**Alternatives Considered**:
- **minio/selfupdate**: Lower-level, requires more manual work. No built-in GitHub release detection.
- **sanbornm/go-selfupdate**: Binary diffing support but less maintained, fewer features.
- **GPG signing**: Requires key management and user-side verification complexity. Cosign's keyless approach is simpler.

#### Implementation Tasks

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 8.1 | Create `.goreleaser.yaml` with darwin-arm64/amd64 builds | - | `goreleaser check` passes |
| 8.2 | Configure universal binary for macOS | 8.1 | `file` command shows "Mach-O universal binary" |
| 8.3 | Add ldflags for version injection | 8.1 | Binary embeds version, commit, date at build |
| 8.4 | Configure checksum generation | 8.1 | Release includes `checksums.txt` with SHA256 |
| 8.5 | Create GitHub Actions release workflow | 8.4 | Push tag triggers release, artifacts uploaded |
| 8.6 | Create install script (`install.sh`) | 8.4 | Script downloads, verifies checksum, installs to /usr/local/bin |
| 8.7 | Configure Homebrew tap in GoReleaser | 8.5 | `brew install owner/tap/ss` works |
| 8.8 | Add version command with build info | 8.3 | `ss --version` shows version, commit, date |

**Deferred to v2**: Tasks 8.6-8.10 from original plan (self-update implementation)

#### Project Structure Addition

```
internal/
├── update/
│   ├── update.go         # Update manager (check, apply)
│   ├── version.go        # Version comparison, build info
│   └── update_test.go    # Unit tests
```

#### Key Implementation Details

**Version Injection via ldflags**:
```yaml
# .goreleaser.yaml
builds:
  - ldflags:
      - "-s -w"
      - "-X main.version={{.Version}}"
      - "-X main.commit={{.ShortCommit}}"
      - "-X main.date={{.Date}}"
```

**Self-Update Implementation Pattern**:
```go
// internal/update/update.go
package update

import (
    "context"
    "github.com/creativeprojects/go-selfupdate"
)

type Manager struct {
    repo    string
    current string
}

func NewManager(repo, currentVersion string) *Manager {
    return &Manager{repo: repo, current: currentVersion}
}

func (m *Manager) Check(ctx context.Context) (*selfupdate.Release, bool, error) {
    updater, err := selfupdate.NewUpdater(selfupdate.Config{
        Validator: &selfupdate.ChecksumValidator{UniqueFilename: "checksums.txt"},
    })
    if err != nil {
        return nil, false, err
    }

    release, found, err := updater.DetectLatest(ctx, selfupdate.ParseSlug(m.repo))
    if err != nil || !found {
        return nil, false, err
    }

    if release.LessOrEqual(m.current) {
        return release, false, nil // Up to date
    }
    return release, true, nil // Update available
}

func (m *Manager) Apply(ctx context.Context, release *selfupdate.Release) error {
    updater, _ := selfupdate.NewUpdater(selfupdate.Config{
        Validator: &selfupdate.ChecksumValidator{UniqueFilename: "checksums.txt"},
    })

    exe, err := selfupdate.ExecutablePath()
    if err != nil {
        return err
    }

    return updater.UpdateTo(ctx, release, exe)
}
```

**Auto-Update on Launch**:
```go
// Called from root command's PersistentPreRun
func MaybeAutoUpdate(cfg *config.Config) {
    if !cfg.Updates.Check {
        return
    }

    mgr := update.NewManager("owner/super-sandbox", version)
    release, hasUpdate, err := mgr.Check(context.Background())
    if err != nil || !hasUpdate {
        return
    }

    if cfg.Updates.AutoApply {
        fmt.Printf("Updating to %s...\n", release.Version())
        if err := mgr.Apply(context.Background(), release); err != nil {
            fmt.Fprintf(os.Stderr, "Auto-update failed: %v\n", err)
            return
        }
        fmt.Println("Updated. Please restart.")
        os.Exit(0)
    } else {
        fmt.Printf("Update available: %s -> %s\n", version, release.Version())
        fmt.Println("Run 'ss update' to install.")
    }
}
```

**Install Script Key Features**:
```bash
#!/bin/sh
set -e

REPO="owner/super-sandbox"
BINARY="ss"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Detect architecture (macOS universal binary handles both)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
if [ "$OS" != "darwin" ]; then
    echo "Error: Super-Sandbox only supports macOS"
    exit 1
fi

# Get latest version
VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

# Download and verify
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

curl -fsSL "https://github.com/${REPO}/releases/download/${VERSION}/${BINARY}_${VERSION#v}_macOS_all.tar.gz" -o "$TMP/archive.tar.gz"
curl -fsSL "https://github.com/${REPO}/releases/download/${VERSION}/checksums.txt" -o "$TMP/checksums.txt"

cd "$TMP"
grep "${BINARY}_${VERSION#v}_macOS_all.tar.gz" checksums.txt | shasum -a 256 -c -

tar -xzf archive.tar.gz
chmod +x "$BINARY"
sudo mv "$BINARY" "$INSTALL_DIR/"

echo "✓ Installed $BINARY $VERSION to $INSTALL_DIR"
```

**GoReleaser Full Config**:
```yaml
# .goreleaser.yaml
version: 2
project_name: ss

before:
  hooks:
    - go mod tidy

builds:
  - id: ss
    main: ./cmd/ss
    env:
      - CGO_ENABLED=0
    goos:
      - darwin
    goarch:
      - amd64
      - arm64
    ldflags:
      - "-s -w"
      - "-X main.version={{.Version}}"
      - "-X main.commit={{.ShortCommit}}"
      - "-X main.date={{.Date}}"
    mod_timestamp: "{{ .CommitTimestamp }}"

universal_binaries:
  - id: ss
    replace: true
    name_template: "ss"

archives:
  - format: tar.gz
    name_template: "{{ .ProjectName }}_{{ .Version }}_macOS_all"

checksum:
  name_template: "checksums.txt"
  algorithm: sha256

release:
  github:
    owner: owner
    name: super-sandbox
  draft: false
  prerelease: auto

brews:
  - name: ss
    description: "Sandboxed Claude Code with native browser automation"
    homepage: "https://github.com/owner/super-sandbox"
    license: "MIT"
    repository:
      owner: owner
      name: homebrew-tools
      token: "{{ .Env.HOMEBREW_TAP_TOKEN }}"
    directory: Formula
    install: |
      bin.install "ss"
    test: |
      system "#{bin}/ss", "--version"

changelog:
  sort: asc
  filters:
    exclude:
      - "^docs:"
      - "^test:"
      - "^ci:"
```

**GitHub Actions Release Workflow**:
```yaml
# .github/workflows/release.yaml
name: Release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  release:
    runs-on: macos-latest  # For universal binary testing
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-go@v5
        with:
          go-version: stable

      - name: Run tests
        run: go test ./...

      - uses: goreleaser/goreleaser-action@v6
        with:
          version: "~> v2"
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          HOMEBREW_TAP_TOKEN: ${{ secrets.HOMEBREW_TAP_TOKEN }}
```

#### Test Strategy

**Unit Tests**:
- `update.Manager.Check()` returns correct update status
- Version comparison logic (semver)
- Config integration (respects `updates.check`, `updates.auto_apply`)

**Integration Tests**:
- `goreleaser check` validates config
- `goreleaser build --snapshot` produces valid binary
- Binary reports correct version via `--version`

**Manual Verification**:
- [ ] Create test release, verify GitHub artifacts
- [ ] Run install script on clean macOS
- [ ] Verify `ss update` downloads and applies update
- [ ] Verify auto-update on launch when enabled
- [ ] Verify Homebrew tap install works
- [ ] Verify universal binary runs on both Intel and Apple Silicon

#### Open Questions

None - all decisions made based on research. Future considerations:
- **Cosign signing**: Add in v2 for supply chain security
- **macOS notarization**: Required if distributing outside Homebrew. Needs Apple Developer account ($99/year). Defer to v2.

#### Cross-Domain Dependencies

- **Domain 7 (Configuration)**: Reads `updates.check` and `updates.auto_apply` settings
- **Domain 1 (CLI)**: Task 1.10 (`ss update` command) uses this update package

---

### Domain 9: VM Image

**Status**: `complete` (simplified)

> **Simplification Decision**: No custom pre-built image for v1. Use vanilla `ubuntu-noble-vanilla:latest` from Lume and provision on first launch via cloud-init user-data. Slower first start (~5 min) but eliminates custom image build/publish infrastructure.

#### Technology Choices

| Concern | Approach | Rationale |
|---------|----------|-----------|
| Base Image | **Lume's vanilla Ubuntu** (`ghcr.io/trycua/ubuntu-noble-vanilla:latest`) | Already available, no build needed |
| Provisioning | **cloud-init user-data on first launch** | `ss` CLI generates and injects user-data |
| Custom Image | **Deferred to v2** | If first-launch time becomes a pain point |

**v1 Approach**:
1. Pull vanilla Ubuntu image on first `ss` run
2. Generate cloud-init user-data with package installs
3. First boot provisions the VM (installs Node, gh, Claude Code, etc.)
4. Subsequent boots are fast (already provisioned)

**Trade-offs**:
- First launch takes ~5 minutes (one-time)
- No custom image build/publish infrastructure needed
- Easy to update provisioning by editing the cloud-init template
- Users always get latest package versions

#### Lume Image Format Details

Lume stores VMs in `~/.lume/<vm-name>/` with this structure:

```
super-sandbox/
├── Disk.img           # RAW disk image (required)
├── MachineIdentifier  # Unique ID (auto-generated)
└── NVRAM              # EFI variable store (auto-generated)
```

Key requirements:
- **RAW format**: Not qcow2 or vmdk. Use `qemu-img convert -O raw` if needed
- **GPT partitioning**: EFI System Partition + root partition
- **APFS sparse**: macOS handles sparse allocation automatically

#### VM Configuration (Target Spec)

| Setting | Value | Notes |
|---------|-------|-------|
| OS | Ubuntu 24.04 LTS (Noble) | ARM64 cloud image |
| Default CPUs | 4 | Configurable via `ss config set cpus` |
| Default Memory | 8 GB | Configurable via `ss config set memory` |
| Default Disk | 100 GB | Sparse, actual usage ~15-20 GB |
| User | `sandbox` | Passwordless sudo |
| Password | `sandbox` | For SSH; may switch to key-only later |
| SSH Port | 2222 | Lume default |

#### Pre-installed Software

| Package | Installation Method | Notes |
|---------|---------------------|-------|
| build-essential | apt | gcc, make, etc. |
| git | apt | Version control |
| curl, wget, jq | apt | Common utilities |
| python3, pip, venv | apt | Python 3.12+ |
| Node.js LTS | NodeSource script | Currently v22.x |
| gh CLI | GitHub apt repo | GitHub CLI for repo operations |
| Vercel CLI | npm global | `vercel` for deployments |
| Claude Code | Native installer | Auto-updates, MCP support |
| socat | apt | For potential socket forwarding fallback |
| htop, tree | apt | Useful utilities |

#### Claude Code MCP Pre-configuration

Claude Code in the VM needs to connect to the tunneled MCP socket for browser automation. Pre-configure:

```bash
# Add browser MCP server (connects to tunneled socket from host)
claude mcp add --scope user --transport stdio browser -- \
  socat UNIX-CONNECT:/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock -

# Or create ~/.claude/settings.json directly:
mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'EOF'
{
  "mcpServers": {
    "browser": {
      "command": "socat",
      "args": ["UNIX-CONNECT:/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock", "-"]
    }
  }
}
EOF
```

**Note**: The socket path `/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock` is created by the `ss` CLI's SSH tunnel when connecting.

#### DevTools MCP Fallback (from Domain 5)

> **Deferred to v2**: DevTools fallback skipped for v1. Only MCP socket bridge is configured.

#### Cloud-Init Configuration

**meta-data**:
```yaml
instance-id: super-sandbox-v1
local-hostname: super-sandbox
```

**user-data**:
```yaml
#cloud-config

hostname: super-sandbox
manage_etc_hosts: true

# User configuration
users:
  - name: sandbox
    gecos: Super Sandbox User
    shell: /bin/bash
    groups: [sudo, docker]
    sudo: "ALL=(ALL) NOPASSWD:ALL"
    lock_passwd: false
    plain_text_passwd: sandbox

# SSH configuration
ssh_pwauth: true

# System updates (first boot only)
package_update: true
package_upgrade: true

# APT sources
apt:
  sources:
    github-cli:
      source: "deb [arch=arm64 signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main"

# Configuration files
write_files:
  # GitHub CLI GPG key setup script
  - path: /tmp/setup-gh-repo.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      mkdir -p /etc/apt/keyrings
      curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
      chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg

  # SSH server hardening
  - path: /etc/ssh/sshd_config.d/99-super-sandbox.conf
    content: |
      PermitRootLogin no
      ClientAliveInterval 60
      ClientAliveCountMax 3
    permissions: '0644'

# Base packages (installed via apt)
packages:
  - build-essential
  - git
  - curl
  - wget
  - jq
  - unzip
  - python3
  - python3-pip
  - python3-venv
  - openssh-server
  - htop
  - tree
  - socat

# Commands run on first boot
runcmd:
  # Setup GitHub CLI repository
  - /tmp/setup-gh-repo.sh
  - apt-get update
  - apt-get install -y gh

  # Install Node.js LTS via NodeSource
  - curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  - apt-get install -y nodejs

  # Install global npm packages
  - npm install -g vercel

  # Install Claude Code via native installer
  - su - sandbox -c "curl -fsSL https://claude.ai/install.sh | bash"

  # Create directories
  - mkdir -p /home/sandbox/projects
  - mkdir -p /home/sandbox/.claude
  - mkdir -p /home/sandbox/.config/gh
  - mkdir -p /home/sandbox/.config/vercel

  # Pre-configure Claude Code MCP for browser bridge
  - |
    cat > /home/sandbox/.claude/settings.json << 'SETTINGS'
    {
      "mcpServers": {
        "browser": {
          "command": "socat",
          "args": ["UNIX-CONNECT:/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock", "-"]
        }
      }
    }
    SETTINGS

  # Fix ownership
  - chown -R sandbox:sandbox /home/sandbox/

  # Enable SSH
  - systemctl enable ssh
  - systemctl start ssh

  # Clean up
  - rm /tmp/setup-gh-repo.sh
  - apt-get clean
  - rm -rf /var/lib/apt/lists/*

final_message: "Super-Sandbox VM ready after $UPTIME seconds"
```

#### Build Script

```bash
#!/bin/bash
# build-image.sh - Build Super-Sandbox VM image
set -euo pipefail

VERSION="${1:-latest}"
WORK_DIR="$(mktemp -d)"
OUTPUT_DIR="./dist"

echo "Building Super-Sandbox VM image v${VERSION}..."

# Download Ubuntu cloud image
UBUNTU_IMAGE="noble-server-cloudimg-arm64.img"
UBUNTU_URL="https://cloud-images.ubuntu.com/noble/current/${UBUNTU_IMAGE}"

if [[ ! -f "${WORK_DIR}/${UBUNTU_IMAGE}" ]]; then
  echo "Downloading Ubuntu 24.04 ARM64 cloud image..."
  curl -L -o "${WORK_DIR}/${UBUNTU_IMAGE}" "${UBUNTU_URL}"
fi

# Resize to target size (100GB sparse)
cp "${WORK_DIR}/${UBUNTU_IMAGE}" "${WORK_DIR}/disk.qcow2"
qemu-img resize "${WORK_DIR}/disk.qcow2" 100G

# Create cloud-init seed ISO
mkdir -p "${WORK_DIR}/cidata"
cp cloud-init/user-data "${WORK_DIR}/cidata/"
cp cloud-init/meta-data "${WORK_DIR}/cidata/"

# Create CIDATA ISO (macOS)
hdiutil makehybrid -iso -joliet \
  -o "${WORK_DIR}/seed.iso" \
  "${WORK_DIR}/cidata/" \
  -default-volume-name CIDATA

# Boot VM with QEMU to run cloud-init
# (Note: On macOS Apple Silicon, use UTM or native vz for better performance)
echo "Booting VM to run cloud-init configuration..."
qemu-system-aarch64 \
  -M virt -cpu cortex-a72 -m 4096 -smp 4 \
  -drive if=pflash,format=raw,file=/opt/homebrew/share/qemu/edk2-aarch64-code.fd,readonly=on \
  -drive if=virtio,format=qcow2,file="${WORK_DIR}/disk.qcow2" \
  -drive if=virtio,format=raw,file="${WORK_DIR}/seed.iso",readonly=on \
  -device virtio-net-pci,netdev=net0 \
  -netdev user,id=net0,hostfwd=tcp::2222-:22 \
  -nographic \
  -serial mon:stdio &

QEMU_PID=$!

# Wait for cloud-init to complete (poll SSH)
echo "Waiting for cloud-init to complete..."
for i in {1..60}; do
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -p 2222 sandbox@localhost "cloud-init status --wait" 2>/dev/null; then
    echo "Cloud-init complete!"
    break
  fi
  sleep 10
done

# Shutdown VM
ssh -p 2222 sandbox@localhost "sudo shutdown -h now" || true
wait $QEMU_PID || true

# Convert to raw format for Lume
echo "Converting to raw format..."
mkdir -p "${OUTPUT_DIR}"
qemu-img convert -f qcow2 -O raw "${WORK_DIR}/disk.qcow2" "${OUTPUT_DIR}/Disk.img"

# Create version file
echo "${VERSION}" > "${OUTPUT_DIR}/VERSION"

echo "Build complete: ${OUTPUT_DIR}/Disk.img"
echo "Size: $(du -h "${OUTPUT_DIR}/Disk.img" | cut -f1)"

# Cleanup
rm -rf "${WORK_DIR}"
```

#### GitHub Actions CI/CD

```yaml
# .github/workflows/build-vm-image.yml
name: Build VM Image

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Image version tag'
        required: true
        default: 'latest'
  push:
    paths:
      - 'vm-image/**'
    branches:
      - main

jobs:
  build:
    runs-on: macos-latest  # Apple Silicon runner for native ARM64
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          brew install qemu coreutils

      - name: Build VM image
        run: |
          cd vm-image
          ./build-image.sh ${{ github.event.inputs.version || 'latest' }}

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push to GHCR
        run: |
          # Note: Lume uses custom OCI format, may need lume CLI for push
          # For now, upload as release artifact
          echo "Image built successfully"

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: super-sandbox-vm-${{ github.event.inputs.version || 'latest' }}
          path: vm-image/dist/
          retention-days: 30
```

#### Image Distribution Strategy

**Option 1: Lume OCI Registry (Preferred)**

```bash
# Push image to GHCR via Lume
lume push super-sandbox ghcr.io/your-org/super-sandbox:v1.0.0

# Users pull with:
lume pull ghcr.io/your-org/super-sandbox:latest
```

**Option 2: GitHub Releases**

For initial distribution, use GitHub Releases with compressed images:

```bash
# Compress image
zstd -19 -T0 dist/Disk.img -o super-sandbox-v1.0.0.img.zst

# Upload to GitHub Release
gh release create v1.0.0 super-sandbox-v1.0.0.img.zst

# Users download and extract
curl -L https://github.com/.../releases/download/v1.0.0/super-sandbox-v1.0.0.img.zst | zstd -d > ~/.lume/super-sandbox/Disk.img
```

#### Image Versioning Strategy

| Tag | Purpose |
|-----|---------|
| `latest` | Most recent stable build |
| `v1.0.0`, `v1.1.0` | Semantic version releases |
| `sha-<commit>` | CI build for specific commit |

**Changelog triggers new version**:
- Ubuntu base image update
- Claude Code major version bump
- Node.js LTS version change
- Security patches to pre-installed packages

#### Implementation Tasks (Simplified for v1)

| Task | Description | Depends On | Done Criteria |
|------|-------------|------------|---------------|
| 9.1 | Create `internal/vm/provision.go` | 2.1 | Package compiles |
| 9.2 | Embed cloud-init user-data template | 9.1 | Template accessible via `embed.FS` |
| 9.3 | Implement `GenerateUserData()` function | 9.2 | Returns valid cloud-config YAML |
| 9.4 | Implement `IsProvisioned()` check | 9.1 | Detects if VM already provisioned (marker file) |
| 9.5 | Implement `WaitForProvisioning()` | 9.1 | Polls SSH until cloud-init complete |
| 9.6 | Integrate provisioning into first-launch flow | 9.3, 9.5 | `ss <project>` provisions on first run |
| 9.7 | Add progress indicator during provisioning | 9.6 | User sees "Installing packages..." etc. |
| 9.8 | Test full first-launch flow | 9.6 | Fresh VM provisions correctly |

**Deferred to v2**: Custom pre-built image with GitHub Actions CI/CD

#### Test Strategy

- **Unit tests**: Validate cloud-config template generation
- **Integration tests**:
  - Pull vanilla Ubuntu image
  - First launch triggers provisioning
  - SSH into VM, verify: user exists, packages installed, Claude Code works
  - Run `ss <project>` again, verify provisioning skipped (fast start)
- **Manual verification**:
  - Fresh macOS machine, install `ss`, first run provisions VM (~5 min)
  - Second run is fast (already provisioned)
  - Test Claude Code browser automation through tunneled socket

#### Open Questions

None - simplified approach removes image build complexity.

#### Cross-Domain Dependencies

- **Domain 2 (Lume)**: VM uses vanilla image from `ghcr.io/trycua/ubuntu-noble-vanilla:latest`
- **Domain 3 (SSH)**: SSH credentials `sandbox:sandbox` on port 2222 as specified
- **Domain 4 (MCP)**: Browser MCP server pre-configured to connect to `/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock`

---

### Planning Workflow

Workers are autonomous. Each iteration:
1. Read the current state (which domains are pending/complete)
2. Read handoff notes from previous iterations
3. **Decide what's most important to work on next**
4. Research thoroughly (web search, docs, existing patterns)
5. Fill in the domain spec (technology choices, tasks, tests)
6. Update domain status to `complete`
7. Write handoff notes for the next iteration

### Exit Conditions

Exit after completing **ONE domain**:
- Update the domain status to `complete`
- Write handoff notes
- Exit normally (no exit tag needed - just finish your turn)

Only use exit tags for:
- **DONE** - All 9 domains are complete
- **BLOCKED: reason** - Human intervention is required

**One task per worker. Fresh context each iteration.**

### Domain Dependencies (Reference Only)

These are natural dependencies to consider, not a prescribed order:

- CLI Framework is foundational (most things depend on it)
- Lume Integration needed before SSH work
- SSH & PTY needed before socket tunneling
- VM Image can be planned somewhat independently

Workers should use judgment about what to tackle based on current state.

---

### Current State

| Domain | Status |
|--------|--------|
| 1. CLI Framework | `complete` |
| 2. Lume Integration | `complete` |
| 3. SSH & PTY | `complete` |
| 4. MCP Socket Bridge | `complete` |
| 5. DevTools Fallback | `complete` |
| 6. Project Management | `complete` |
| 7. Configuration | `complete` |
| 8. Distribution | `complete` |
| 9. VM Image | `complete` |

**Completed**: 9/9

---

### Handoff Notes

> After completing work each iteration, write notes here.
> Include: what you completed, key decisions, cross-domain implications, and your assessment of what might be most important next (but the next worker decides).

---

#### Iteration 3: Domain 3 (SSH & PTY) - Complete

**What was completed:**
- Researched Go SSH libraries thoroughly
- Selected `golang.org/x/crypto/ssh` as primary library (standard, full-featured, native socket forwarding)
- Selected `golang.org/x/term` for terminal handling
- Documented key implementation patterns: connection, interactive shell, socket forwarding
- Defined 11 implementation tasks with clear done criteria
- Documented important gotchas (terminal restore, Signal() unreliability, etc.)

**Key decisions:**
1. **Use standard library over wrappers**: `golang.org/x/crypto/ssh` provides everything needed including Unix socket forwarding via `ListenUnix()`. Wrappers like `goph` lack critical features.
2. **Password auth for simplicity**: Default VM credentials `sandbox:sandbox`. Can add key-based auth later.
3. **Ignore host key verification**: VM is local and ephemeral, so strict host key checking adds complexity without security benefit.
4. **Fresh connection per invocation**: No connection pooling for v1. Each `ss <project>` creates a new connection.

**Cross-domain implications:**
- **Domain 4 (MCP Socket Bridge)**: Task 3.8 (`ForwardUnixSocket`) provides the foundation. Domain 4 needs to discover the host socket path and set up the forwarding.
- **Domain 5 (DevTools Fallback)**: Task 3.9 (`ForwardTCPPort`) provides TCP forwarding for CDP port 9222.
- **Domain 2 (Lume)**: SSH connects to port 2222 as documented in Lume research. VM must be running before SSH connects.

**Assessment of what might be most important next:**
- **Domain 4 (MCP Socket Bridge)** is the natural next step—it builds directly on the socket forwarding implemented in Domain 3 and is core to the browser integration promise.
- **Domain 6 (Project Management)** could also be tackled independently if someone wants to parallelize.

---

#### Iteration 4: Domain 4 (MCP Socket Bridge) - Complete

**What was completed:**
- Researched Claude Code's MCP socket architecture thoroughly (actual paths, naming conventions, chrome-native-host internals)
- Documented socket path pattern: `/tmp/claude-mcp-browser-bridge-$USER/<pid>.sock`
- Created socket discovery algorithm with glob + mtime sort + connectivity test
- Designed socket forwarding implementation using `ssh.Client.ListenUnix()`
- Defined 10 implementation tasks with clear done criteria
- Documented validation flow and user-friendly error messages
- Identified ListenUnix race condition and mitigation strategy

**Key decisions:**
1. **Transparent tunneling**: No MCP protocol parsing needed. The JSON-RPC 2.0 messages flow through unchanged as raw bytes.
2. **Forward most recent socket**: Host's chrome-native-host handles multiplexing, so we only need to tunnel one socket.
3. **Fixed VM socket path**: Use `/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock` in VM—Claude Code connects to this predictable path.
4. **Glob + connectivity test for discovery**: Stale sockets from crashes persist, so file existence alone isn't enough.

**Key discoveries:**
- `chrome-native-host` is a wrapper script that execs the Claude Code binary with `--chrome-native-host` flag
- Socket directory has `0700` permissions (owner only)
- Go's `ListenUnix()` has a race condition—add 100ms delay after creating listener
- Host's chrome-native-host already supports concurrent MCP connections, so VM multiplexing is handled upstream

**Cross-domain implications:**
- **Domain 5 (DevTools Fallback)**: When MCP socket discovery fails, fallback to Chrome DevTools Protocol. Domain 4's validation logic triggers Domain 5.
- **Domain 3 (SSH & PTY)**: Uses Task 3.8 (`ForwardUnixSocket`) as foundation. Implementation is straightforward extension.

**Assessment of what might be most important next:**
- **Domain 5 (DevTools Fallback)** is the natural next step—it completes the browser automation story when the primary method fails.
- **Domain 6 (Project Management)** could be tackled in parallel—it's independent of browser integration.
- **Domain 7 (Configuration)** is foundational for many features but not blocking.

---

#### Iteration 5: Domain 5 (DevTools Fallback) - Complete

**What was completed:**
- Researched Chrome DevTools Protocol detection via `localhost:9222/json/version` endpoint
- Researched `chrome-devtools-mcp` npm package configuration (official Google package, released Sept 2025)
- Designed CDP detection implementation using HTTP GET with timeout
- Designed TCP port forwarding using Go SSH library's `client.Dial()` (simpler than socket forwarding)
- Created fallback detection flow that tries MCP socket first, then DevTools
- Designed user-facing messages for all states (MCP active, DevTools fallback, neither available)
- Defined 10 implementation tasks with clear done criteria

**Key decisions:**
1. **Sequential fallback**: Try MCP socket first (primary), then DevTools if MCP unavailable. Don't run both simultaneously.
2. **Separate Chrome profile for DevTools**: Use `--user-data-dir` to avoid conflicts with existing Chrome processes. Users log in once to this profile and sessions persist.
3. **Helper script**: Provide `start-chrome-debug.sh` to simplify Chrome debug launch for users.
4. **VM pre-configuration**: chrome-devtools-mcp is configured in VM image build (Domain 9) with `--browserUrl http://127.0.0.1:9222`.

**Key discoveries:**
1. **Port reuse problem**: Chrome ignores `--remote-debugging-port` if another Chrome is running. Solved with separate `--user-data-dir`.
2. **TCP forwarding is simpler**: Unlike Domain 4's Unix socket forwarding via `ListenUnix()`, TCP forwarding just uses `client.Dial("tcp", ...)` for each connection.
3. **No CDP parsing needed**: Just forward port 9222; `chrome-devtools-mcp` in the VM handles all protocol.
4. **Node.js v20.19+ required**: chrome-devtools-mcp has this as minimum requirement.

**Cross-domain implications:**
- **Domain 9 (VM Image)**: Must pre-configure chrome-devtools-mcp with correct `--browserUrl http://127.0.0.1:9222` and `--no-usage-statistics`. Add this to the package installation task.
- **Domain 3 (SSH & PTY)**: Task 3.9 `ForwardTCPPort` provides the foundation. Implementation is straightforward.

**Assessment of what might be most important next:**
- **Domain 6 (Project Management)** is user-facing and independent of VM/SSH work. Would be good to tackle next.
- **Domain 7 (Configuration)** is foundational for storing settings (VM resources, update preferences) but not blocking other work.
- **Domain 9 (VM Image)** now has a clearer picture of what needs pre-configuration (from Domains 4 and 5).

---

#### Iteration 6: Domain 6 (Project Management) - Complete

**What was completed:**
- Researched Go file operations (`os.MkdirAll`, `os.WriteFile`, `os.ReadDir`) - all needs covered by stdlib
- Researched `embed` package for template embedding - `//go:embed` directive with `embed.FS`
- Researched git initialization approaches: go-git vs exec.Command
- Researched gh CLI for GitHub repo creation (`gh repo create`)
- Designed complete project manager interface with CRUD operations
- Created template files (AGENTS.md, README.md, .gitignore) with `{{.ProjectName}}` substitution
- Defined metadata structure (JSON at `.ss/metadata.json`)
- Defined 13 implementation tasks with clear done criteria
- Added project name validation regex

**Key decisions:**
1. **exec.Command for git over go-git**: go-git adds significant dependency for one-time `git init`. Since users have git installed anyway, exec is simpler and more maintainable.
2. **exec.Command for gh CLI**: gh handles all auth complexity (tokens, SSO, org permissions). Re-implementing would be fragile.
3. **embed package for templates**: Templates compiled into binary, no external files to manage. Simple string replacement for `{{.ProjectName}}` is sufficient.
4. **JSON metadata**: Standard library support, human-readable for debugging, machine-read so no YAML convenience needed.

**Key discoveries:**
1. `embed` package requires import even for `string` or `[]byte` types (use `_ "embed"` blank import)
2. gh CLI `--source=.` flag creates remote from existing local repo
3. Git initial commit needs explicit author/committer env vars to avoid prompts

**Cross-domain implications:**
- **Domain 1 (CLI)**: Tasks 1.4-1.6 (stub commands for new/list/delete) can now be fully implemented using project manager
- **Domain 7 (Configuration)**: Project manager reads `baseDir` from config; need to coordinate default path

**Assessment of what might be most important next:**
- **Domain 7 (Configuration)** is logical next step - provides settings for VM resources, update preferences, and project base directory
- **Domain 8 (Distribution)** can be tackled in parallel - independent of config internals
- **Domain 9 (VM Image)** has clear requirements from Domains 4, 5, but is a different skill set (Ubuntu image building)

---

#### Iteration 7: Domain 7 (Configuration) - Complete

**What was completed:**
- Researched Go configuration libraries (Viper, koanf, yaml.v3) via Context7 and web search
- Selected `gopkg.in/yaml.v3` for YAML parsing (simple, minimal deps, struct tag support)
- Designed Config/VMConfig/UpdatesConfig struct types with yaml tags
- Implemented human-readable size parsing ("8GB" ↔ bytes) with regex validation
- Created comprehensive validation with clear error messages
- Designed Manager pattern for load/save/update operations
- Defined 12 implementation tasks with clear done criteria
- Documented environment variable overrides (SS_HOME, SS_NO_UPDATE, SS_DEBUG)

**Key decisions:**
1. **yaml.v3 over Viper/koanf**: Our config is simple (one file, ~6 settings). Viper adds 10+ transitive deps for features we don't need (remote config, watch, pflag). yaml.v3 gives us struct marshaling with zero extra complexity.
2. **Custom validation over go-playground/validator**: Validation rules are simple (numeric ranges, regex for sizes). Custom `Validate()` methods are clear and have zero deps.
3. **Human-readable sizes**: Using "8GB" format instead of bytes makes config.yaml user-friendly. `ParseSize()`/`FormatSize()` handle conversion.
4. **Manager pattern with setters**: Each `Set*()` method validates and saves, ensuring config is always valid on disk.

**Key discoveries:**
1. go-yaml/yaml was archived on April 1, 2025 - but gopkg.in/yaml.v3 continues to work and is widely used
2. yaml.v3 preserves defaults for missing keys when unmarshaling into an existing struct
3. Lume expects memory/disk in bytes, so ParseSize() is essential for CLI ↔ Lume translation

**Cross-domain implications:**
- **Domain 2 (Lume)**: VM resources (cpus, memory, disk) need to be read from config and converted to bytes for Lume API calls
- **Domain 6 (Project Management)**: `GetBaseDir()` provides the projects directory path - coordinate with project manager's `baseDir` parameter
- **Domain 8 (Distribution)**: Update settings (`check`, `auto_apply`) control whether the auto-updater runs

**Assessment of what might be most important next:**
- **Domain 8 (Distribution)** is the logical next step - it's user-facing (how people install `ss`) and uses config for update settings
- **Domain 9 (VM Image)** can be tackled in parallel - it's largely independent (Ubuntu image building) but needs Domains 4/5 info for pre-configuration

---

#### Iteration 8: Domain 8 (Distribution) - Complete

**What was completed:**
- Researched GoReleaser v2 configuration for macOS ARM64/AMD64 builds with universal binaries
- Researched creativeprojects/go-selfupdate library (v1.x) - selected as primary self-update solution
- Designed complete release pipeline with GitHub Actions
- Created install script with SHA256 checksum verification
- Designed self-update implementation with config integration
- Configured Homebrew tap integration via GoReleaser
- Defined 13 implementation tasks with clear done criteria

**Key decisions:**
1. **GoReleaser v2 for releases**: Industry standard, handles cross-compilation, universal binaries, checksums, GitHub releases, and Homebrew formula generation in one config. No need for custom build scripts.
2. **creativeprojects/go-selfupdate over minio/selfupdate**: Higher-level API with built-in GitHub release detection, `ChecksumValidator` that works directly with GoReleaser's `checksums.txt`, and rollback support.
3. **Universal binaries for macOS**: Single fat binary works on both Intel and Apple Silicon. Simplifies distribution and user experience.
4. **Defer signing to v2**: Checksum verification provides sufficient integrity for v1. Cosign (keyless signing via GitHub Actions OIDC) and macOS notarization can be added in v2.
5. **Config-aware auto-update**: Respects `updates.check` and `updates.auto_apply` settings from Domain 7's config system.

**Key discoveries:**
1. GoReleaser's `universal_binaries` with `replace: true` creates a single macOS binary that replaces individual arch builds
2. creativeprojects/go-selfupdate's `ChecksumValidator{UniqueFilename: "checksums.txt"}` integrates directly with GoReleaser output
3. macOS notarization requires Apple Developer account ($99/year) - defer to v2 when distribution scale justifies cost
4. Install script must use `shasum -a 256 -c` (macOS) not `sha256sum -c` (Linux)

**Cross-domain implications:**
- **Domain 7 (Configuration)**: Update manager reads `updates.check` and `updates.auto_apply` settings
- **Domain 1 (CLI)**: Root command's `PersistentPreRun` should call `MaybeAutoUpdate()` to check on every launch

**Assessment of what might be most important next:**
- **Domain 9 (VM Image)** is the only remaining domain. It's a different skillset (Ubuntu image building, cloud-init, Lume image format) but has clear requirements from Domains 4 (MCP socket pre-config) and 5 (chrome-devtools-mcp installation).

---

#### Iteration 9: Domain 9 (VM Image) - Complete

**What was completed:**
- Researched Lume image format thoroughly (RAW disk images, OCI registry distribution, VM bundle structure)
- Researched cloud-init NoCloud datasource for local VM configuration (CIDATA ISO approach)
- Researched Packer options for ARM64 (Tart plugin, packer-plugin-lume) vs manual shell scripts
- Researched Claude Code CLI installation (native installer vs npm, MCP configuration)
- Designed complete cloud-init user-data with all pre-installed packages
- Created build script workflow with QEMU for qcow2→raw conversion
- Defined GitHub Actions CI/CD for automated image builds
- Defined 13 implementation tasks with clear done criteria

**Key decisions:**
1. **Ubuntu cloud image over ISO installation**: Cloud images boot directly with cloud-init, no interactive installer needed. Download `noble-server-cloudimg-arm64.img`, resize, apply cloud-init, done.
2. **Shell script + QEMU for v1, not Packer**: Packer-plugin-lume is immature, and Tart output would need conversion. Shell scripts give full control over the exact Lume-compatible output format.
3. **CIDATA ISO for cloud-init**: Standard approach—create ISO with volume label `CIDATA` containing user-data and meta-data. Cloud-init auto-discovers it on boot.
4. **Native Claude Code installer**: `curl -fsSL https://claude.ai/install.sh | bash` is the recommended method, provides auto-updates, no Node.js dependency for the binary itself.
5. **RAW disk format**: Lume/Apple Virtualization Framework requires raw disk images, not qcow2. Use `qemu-img convert -O raw` after cloud-init completes.

**Key discoveries:**
1. Lume stores VMs in `~/.lume/<vm-name>/` with `Disk.img` (raw), `MachineIdentifier`, and `NVRAM`. MachineIdentifier is auto-generated on first boot.
2. Lume uses OCI registry format for distribution—can push/pull from GHCR with `lume push/pull`.
3. Claude Code MCP servers configured via `claude mcp add` command or `~/.claude/settings.json` JSON file.
4. MCP browser bridge in VM needs to connect to `/tmp/claude-mcp-browser-bridge-sandbox/bridge.sock`—the socket that `ss` CLI tunnels from host.
5. GitHub-hosted macOS runners are x86, so ARM64 builds require either self-hosted Apple Silicon runners or QEMU emulation.

**Cross-domain implications:**
- **Domain 2 (Lume)**: `lume pull` or `lume create` will use this image. Image stored at standard Lume location.
- **Domain 3 (SSH)**: SSH credentials are `sandbox:sandbox` on port 2222 as documented.
- **Domain 4 (MCP)**: Browser MCP server pre-configured in VM's `~/.claude/settings.json` pointing to tunneled socket.
- **Domain 5 (DevTools)**: chrome-devtools-mcp pre-configured as fallback.
- **Domain 8 (Distribution)**: VM image distributed separately from CLI binary—CLI pulls image on first use.

**Assessment of what might be most important next:**
- **ALL 9 DOMAINS ARE NOW COMPLETE**. The specification phase is done.
- Next phase is implementation, starting with Domain 1 (CLI Framework) since it's foundational.
- Implementation order should roughly follow: 1 → 7 → 6 → 2 → 3 → 4 → 5 → 8 → 9 (build CLI skeleton → config → projects → VM lifecycle → SSH → browser bridge → distribution → VM image).

---

<exit>DONE</exit>
