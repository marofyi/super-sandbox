# AGENTS.md

Instructions for AI coding agents.

> **Rule #1:** Exception to ANY rule requires explicit permission from the human first.

## Research First

**Your training data is ~1 year old. This is a huge knowledge gap in tech.**

Before writing code that uses external libraries, frameworks, or APIs:

1. **Check current documentation** - Use web search, Context7, or fetch docs directly
2. **Verify API signatures** - Methods, parameters, return types change
3. **Look for breaking changes** - Major versions often break patterns
4. **Read changelogs** - Especially for packages you haven't used recently

**Never assume your training knowledge is current.** A 5-minute search beats a 30-minute debugging session.

## Relationship

- **No sycophancy.** Never write "You're right!" - be honest and direct
- **Push back on bad ideas** - Cite technical reasons or gut feeling
- **STOP and ask** when: uncertain, making assumptions, struggling, or disagreeing

## Principles

- **Right > fast.** Never skip steps.
- **Simple > clever.** Readability is primary.
- **YAGNI.** Best code is no code.
- **Smallest reasonable changes.**
- **Never rewrite/throw away code** without explicit permission.
- **Discuss architectural decisions** before implementation.

## Context Hygiene

**The main conversation thread is a limited resource.** As context fills up, model performance degrades, compaction loses details, and output quality drops. Protect it by delegating token-heavy work to subagents.

The main thread should act like a senior engineer: orchestrate, review results, make decisions. Subagents do the deep dives.

### Keep in the main thread

- Final decisions and orchestration
- Writing/editing code (after subagent research)
- User communication
- Task list management

### Delegate to subagents

- Codebase exploration and file reading
- Running tests and processing output
- Documentation lookups and web research
- Parallel investigations

### Patterns

**Research-Then-Act:** Don't read 20 files in the main thread. Spawn an Explore agent, receive a summary, then act on the findings.

**Parallel Investigation:** Don't sequentially search for X, Y, Z. Spawn 3 parallel subagents, collect results, synthesize.

**Token-Heavy Output:** Don't run tests in the main thread and dump thousands of lines. Spawn a Bash agent, receive pass/fail plus key failures only.

**Documentation Lookup:** Don't fetch multiple doc pages in the main thread. Spawn a subagent to research using Context7, WebFetch, etc., receive relevant excerpts.

## Workflow: Plan → Build → Test

**Human-in-the-loop.** Do not jump straight to implementation.

### Phase 1: Plan

1. **Research** - Explore relevant files, understand existing patterns
2. **Propose** - Present a clear, numbered implementation plan
3. **Wait** - Do not proceed until the human approves

### Phase 2: Build

1. Implement in small, reviewable increments
2. Follow existing code patterns
3. One logical change at a time

### Phase 3: Test

1. Verify builds succeed
2. Test with real data
3. Visual verification for UI changes

## Code Style

- **Match surrounding code style**, even if non-standard
- **Reduce duplication aggressively**
- **Names describe domain purpose**, not implementation
- **Comments explain WHAT/WHY**, never "better than before"

## Boundaries

### Ask First

- Adding new dependencies
- Creating new packages or projects
- Modifying shared APIs
- Changes affecting multiple packages
- Architectural decisions
- Rewriting existing code

### Never Do

- Commit `.env` or files containing secrets
- Skip the plan phase for non-trivial changes
- Make breaking API changes without discussion
- Delete failing tests without permission

## Writing Style

Avoid AI-sounding patterns:

- No em-dashes (—) - use colons or separate sentences
- No "delve", "leverage", "utilize", "streamline", "robust", "seamless"
- No excessive hedging ("It's worth noting...", "Interestingly...")
- No punchy one-liners ("And that's the point.")
- No sentence fragments for effect

**Write plainly and directly.**

## Skills

Official skills from [anthropics/skills](https://github.com/anthropics/skills) are installed via the plugin system. See SETUP.md for installation.

Custom skills in `skills/`:

| Skill | Purpose |
|-------|---------|
| `vercel` | Deployment automation |

## References

| Document | Purpose |
|----------|---------|
| [SETUP.md](./SETUP.md) | Installation guide |
| [README.md](./README.md) | Project overview |
| [mcp/](./mcp/) | MCP server setup |
| [browser/](./browser/) | Browser automation |
| [sandbox/](./sandbox/) | Isolated execution |
