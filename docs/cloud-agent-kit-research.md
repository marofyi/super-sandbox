# Cloud Agent Kit: Competitive Research & UX Patterns

> **Status:** Research Complete
> **Last Updated:** 2026-01-06

This document captures research on similar open source projects, onboarding patterns, and UX best practices to inform Cloud Agent Kit's design.

---

## Table of Contents

1. [Competitive Landscape](#competitive-landscape)
2. [Onboarding UX Patterns](#onboarding-ux-patterns)
3. [Content Organization Patterns](#content-organization-patterns)
4. [CLAUDE.md Best Practices](#claudemd-best-practices)
5. [Key Insights for Cloud Agent Kit](#key-insights-for-cloud-agent-kit)
6. [Sources](#sources)

---

## Competitive Landscape

### Direct Competitors (Claude Code Boilerplates)

| Project | Focus | Unique Approach | Stars |
|---------|-------|-----------------|-------|
| [serpro69/claude-starter-kit](https://github.com/serpro69/claude-starter-kit) | MCP server orchestration | Collaborative-first, team configs in `.claude/settings.local.json` | - |
| [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) | Component marketplace | Web interface at aitmpl.com, 100+ installable components | - |
| [centminmod/my-claude-code-setup](https://github.com/centminmod/my-claude-code-setup) | Context retention | "Memory bank" system with CLAUDE-*.md files | - |
| [halans/cc-marketplace-boilerplate](https://github.com/halans/cc-marketplace-boilerplate) | Plugin creation | Marketplace plugin structure (commands, agents, skills) | - |
| [scotthavird/claude-code-template](https://github.com/scotthavird/claude-code-template) | Data science | DevContainer support, hook logging for analysis | - |
| [shinpr/ai-coding-project-boilerplate](https://github.com/shinpr/ai-coding-project-boilerplate) | TypeScript precision | Sub-agent architecture for complex projects | - |

### Adjacent Tools (AI Agent Frameworks)

| Tool | Description | Key Feature |
|------|-------------|-------------|
| [block/goose](https://github.com/block/goose) | Open source AI agent from Block | MCP-native, any LLM, local-first |
| [OpenCode](https://opencode.ai) | Open source coding agent | 75+ LLM providers, 45k stars, 650k monthly users |
| Microsoft Agent Framework | Multi-agent SDK | AutoGen + Semantic Kernel merger, MIT license |
| [LangGraph](https://github.com/langchain-ai/langgraph) | Agent orchestration | Lowest latency across benchmarks |

### Curation & Discovery

| Project | Focus | Pattern |
|---------|-------|---------|
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Resource curation | Category-based navigation, 75+ repos indexed |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | Subagent collection | 100+ agents across 10 categories, YAML templates |
| [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | Cursor rules | 12 categories by framework/language, CC0 license |

### Industry Standards

| Standard | Status | Adoption |
|----------|--------|----------|
| **AGENTS.md** | Linux Foundation (AAIF) | 60,000+ repos, supported by Codex, Cursor, Copilot, Gemini CLI |
| **Model Context Protocol (MCP)** | Linux Foundation (AAIF) | Thousands of servers, adopted by OpenAI (March 2025) |
| **Agent Skills** | Community spec | Standardized skill structure (SKILL.md + scripts) |

---

## Onboarding UX Patterns

### Pattern 1: Template Repository + GitHub Actions

**Used by:** serpro69/claude-starter-kit

**How it works:**
1. User clicks "Use this template" on GitHub
2. GitHub Actions workflow (`template-cleanup`) auto-runs
3. Workflow detects language, prompts for configuration
4. Repository customized automatically

**Pros:** Zero CLI needed, works from browser
**Cons:** Requires GitHub, less control over process

### Pattern 2: Interactive CLI Wizard

**Used by:** create-next-app, davila7/claude-code-templates

**How it works:**
```bash
npx create-next-app@latest
# Prompts: TypeScript? Tailwind? App Router? etc.
```

**Key libraries:**
- `inquirer` / `@inquirer/prompts` - Interactive prompts
- `Clack` - Modern, beautiful prompts
- `commander` / `yargs` - Command parsing
- `ora` - Spinners

**Pros:** Guided experience, validates choices
**Cons:** Requires Node.js, more friction than clone

### Pattern 3: degit/tiged (Zero-History Clone)

**Used by:** Svelte, many template repos

**How it works:**
```bash
npx tiged user/repo my-project
cd my-project
```

**Pros:**
- Faster than git clone (no history)
- No `.git` folder confusion
- Supports subdirectories (`tiged user/repo/src`)
- Works offline (caching)

**Cons:** Requires npm/npx

### Pattern 4: Progressive Configuration

**Used by:** Goose, OpenCode

**How it works:**
1. Simple install command
2. Sensible defaults work immediately
3. Customization happens post-install as needed

**Philosophy:** "Runs Locally → Extensible → Autonomous"

**Pros:** Lowest friction to first success
**Cons:** Users may miss powerful features

### Pattern 5: Memory Bank System

**Used by:** centminmod/my-claude-code-setup

**How it works:**
```
CLAUDE.md           # Primary context
CLAUDE-patterns.md  # Code patterns discovered
CLAUDE-decisions.md # Architecture decisions (ADRs)
CLAUDE-troubleshooting.md # Known issues
CLAUDE-activeContext.md   # Current session state
```

After completing tasks: `/update memory bank` syncs knowledge

**Pros:** Context persists across sessions, grows with project
**Cons:** Maintenance overhead, manual sync required

### Pattern 6: Component Marketplace

**Used by:** davila7/claude-code-templates

**How it works:**
1. Web interface (aitmpl.com) for browsing
2. `npx claude-code-templates@latest` for interactive install
3. Categories: Agents, Commands, MCPs, Settings, Hooks, Skills

**Pros:** Discovery-friendly, modular adoption
**Cons:** Complexity, external dependency

---

## Content Organization Patterns

### Subagent Organization (VoltAgent)

**10 Categories:**
1. Core Development (APIs, frontend, backend)
2. Language Specialists (TypeScript, Python, Rust...)
3. Infrastructure (DevOps, K8s, Terraform)
4. Quality & Security (testing, code review)
5. Data & AI (ML, NLP, LLM architecture)
6. Developer Experience (build tools, docs)
7. Specialized Domains (blockchain, IoT, fintech)
8. Business & Product (PM, product strategy)
9. Meta & Orchestration (multi-agent coordination)
10. Research & Analysis (market research)

**Agent Template:**
```yaml
name: code-reviewer
description: Reviews code for quality and best practices
tools: [Read, Glob, Grep]  # Read-only for reviewers
prompt: |
  You are a senior code reviewer...
```

### Cursor Rules Organization (awesome-cursorrules)

**12 Categories:**
1. Frontend Frameworks (React, Next.js, Vue...)
2. Backend/Full-Stack (Node, Python, Go...)
3. Mobile (React Native, Flutter, SwiftUI)
4. CSS & Styling (Tailwind, styled-components)
5. State Management (Redux, MobX)
6. Database & API (GraphQL, REST)
7. Testing (Cypress, Jest, Playwright)
8. Hosting & Deployments
9. Build Tools (Chrome extensions, K8s)
10. Language-Specific
11. Other (game dev, optimization)
12. Documentation & Utilities

### Awesome List Pattern (sindresorhus/awesome)

**Principles:**
- "Only awesome is awesome" - curation, not collection
- Personal recommendation required
- Rather leave out than include too much
- Clear categories with descriptions
- Contribution guidelines (CONTRIBUTING.md)

**Discovery:**
- README as navigation hub
- Topic tags on GitHub
- External search tools (Awesome Search)

---

## CLAUDE.md Best Practices

### From HumanLayer Research

**Core Framework:**
- **WHAT**: Tech stack, project structure, codebase map
- **WHY**: Purpose, what everything does
- **HOW**: Workflow instructions, testing, verification

**Constraints:**
- LLMs can follow ~150-200 instructions reliably
- Claude Code's system prompt uses ~50 already
- **Recommendation: < 300 lines, ideally < 60**

**Anti-patterns:**
- Don't use as linter substitute ("Never send an LLM to do a linter's job")
- Don't auto-generate - deserves careful manual crafting
- Don't over-specify code style - LLMs learn from context

**Progressive Disclosure:**
```
CLAUDE.md                  # Core instructions (<60 lines)
docs/building.md           # Detailed build instructions
docs/conventions.md        # Code style details
docs/architecture.md       # System design
```

### From Arize Prompt Learning Research

**Data-Driven Findings:**
- Repository-specific optimization: **+10.87% improvement**
- Cross-repository generalization: **+5.19% improvement**
- Rich feedback beats scalar rewards

**What to Include:**
- Common bash commands
- Core files and utility functions
- Code style guidelines
- Testing instructions
- Repository etiquette
- Developer environment setup
- Unexpected behaviors or warnings

### From Cursor Rules Research

**File Structure (2025):**
```
.cursor/rules/     # Per-rule .mdc files (new)
.cursorrules       # Legacy single file (deprecated)
```

**Best Practices:**
- Keep rules under 500 lines
- Split into focused files by concern
- Give concrete names and descriptions
- Test and iterate based on usage
- Document the "why" behind rules

**The 2025 Stack:**
> MCPs + Rules + Memories + Auto run = Predictable AI

---

## Key Insights for Cloud Agent Kit

### Positioning Opportunities

1. **Cloud-First is Underserved**
   - Most competitors assume local execution
   - CC Web, Codex users have unique constraints
   - Our browserless HTTP client is genuinely differentiated

2. **AGENTS.md is Now a Standard**
   - 60,000+ repos adopted
   - Linux Foundation backing
   - We should support both CLAUDE.md and AGENTS.md

3. **Memory/Context Persistence is Valuable**
   - centminmod's memory bank system is clever
   - Could adapt this pattern for Cloud Agent Kit

### UX Recommendations

1. **Hybrid Onboarding**
   - Primary: `npx tiged` for instant start (zero history)
   - Secondary: GitHub template for browser-only users
   - Tertiary: Full CLI wizard for guided setup

2. **Progressive Disclosure**
   - Minimal CLAUDE.md out of box (<60 lines)
   - Detailed docs in separate files
   - "Unlockable" features as users grow

3. **First Success in 2 Minutes**
   ```bash
   npx tiged marofyi/cloud-agent-kit my-project
   cd my-project
   pnpm install
   # Ready to use with Claude Code
   ```

4. **Component Discovery**
   - README as navigation hub (awesome-list style)
   - Clear categories for agents, skills, examples
   - Each component self-documented

### Structure Recommendations

1. **Adopt AGENTS.md Standard**
   - Keep our current file, rename or alias
   - Ensure compatibility with Cursor, Codex, Copilot

2. **Template System**
   ```
   templates/
   ├── AGENTS.md          # Starter template
   ├── CLAUDE.md          # Points to AGENTS.md
   ├── memory-bank/       # Optional memory system
   │   ├── CLAUDE.md
   │   ├── CLAUDE-patterns.md
   │   └── ...
   └── package/           # New package scaffold
   ```

3. **Examples Hierarchy**
   ```
   examples/
   ├── minimal/           # Single HTML file
   ├── react-cdn/         # React without build
   ├── typescript-lib/    # Package template
   └── next-app/          # Full application
   ```

### Differentiation Strategy

| Competitor Focus | Our Differentiation |
|------------------|---------------------|
| MCP orchestration | Cloud environment compatibility |
| Component marketplace | Opinionated, works out-of-box |
| Memory bank system | Lightweight + optional memory |
| Subagent collections | Curated, production-tested |

**Our USP:** "The only boilerplate designed for cloud agent environments. Works in CC Web, Codex, and anywhere with network constraints."

---

## Sources

### Claude Code Boilerplates
- [serpro69/claude-starter-kit](https://github.com/serpro69/claude-starter-kit)
- [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates)
- [centminmod/my-claude-code-setup](https://github.com/centminmod/my-claude-code-setup)
- [halans/cc-marketplace-boilerplate](https://github.com/halans/cc-marketplace-boilerplate)
- [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)

### Best Practices & Research
- [Anthropic: Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [HumanLayer: Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [Arize: CLAUDE.md Best Practices from Prompt Learning](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/)
- [PromptHub: Top Cursor Rules](https://www.prompthub.us/blog/top-cursor-rules-for-coding-agents)

### Agent Collections
- [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)

### AI Agent Frameworks
- [block/goose](https://github.com/block/goose)
- [OpenCode](https://opencode.ai)
- [Linux Foundation: Agentic AI Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)

### Scaffolding Tools
- [tiged/tiged](https://github.com/tiged/tiged) (degit fork)
- [Next.js: create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app)

### Standards
- [AGENTS.md Gist](https://gist.github.com/0xfauzi/7c8f65572930a21efa62623557d83f6e)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cursor Rules Documentation](https://cursor.com/docs/context/rules)

## See Also

- [README.md](../README.md) - Project overview and navigation
- [docs/cloud-agent-kit-plan.md](./cloud-agent-kit-plan.md) - Phase plan and decisions derived from this research
