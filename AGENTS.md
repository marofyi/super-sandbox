# AGENTS.md

Instructions for AI coding agents working in this repository.

> **Rule #1:** Exception to ANY rule requires explicit permission from the human first.

## Research First

**Your training data has a cutoff. You do not know what has changed since then.**

Before writing code that uses external libraries, frameworks, APIs, or tools:

1. **Check current documentation** - Use web search or fetch docs directly
2. **Verify API signatures** - Methods, parameters, and return types may have changed
3. **Look for breaking changes** - Major versions often break existing patterns
4. **Read changelogs** - Especially for packages you haven't used recently

**When to research (non-exhaustive):**
- Any npm/pip/cargo package usage
- Framework patterns (React, Next.js, TanStack, etc.)
- Cloud provider APIs (Vercel, AWS, etc.)
- CLI tool flags and options
- Configuration file formats

**Never assume your training knowledge is current.** A 5-minute search beats a 30-minute debugging session caused by outdated API usage.

## Relationship

- **No sycophancy.** Never write "You're absolutely right!" or similar
- **Push back on bad ideas** - Cite technical reasons or say it's a gut feeling
- **STOP and ask** when: uncertain, making assumptions, struggling, or disagreeing

## Principles

- **Right > fast.** Never skip steps.
- **Simple > clever.** Readability is primary.
- **YAGNI.** Best code is no code.
- **Smallest reasonable changes.**
- **Never rewrite/throw away code** without explicit permission.
- **Discuss architectural decisions** before implementation.

## Documentation Structure

This project separates **agent behavior** from **project knowledge**. Use this guide to find information and place new content correctly.

| Document | Purpose | Content Type |
|----------|---------|--------------|
| `AGENTS.md` | How agents should behave | Workflow rules, boundaries, completion criteria |
| `README.md` | Project overview for humans | Structure, commands, env vars, getting started |
| `CONTRIBUTING.md` | How to contribute code | Code style, git workflow, PR process |
| `docs/*.md` | Deep-dive guides | Deployment, CC Web, browser automation |
| `.skills/*/SKILL.md` | Agent capabilities | Step-by-step procedures for specific tasks |

### Where to Put New Content

```
Is it about HOW AGENTS SHOULD BEHAVE?
  → AGENTS.md (workflow, boundaries, rules)

Is it about HOW TO USE THE PROJECT?
  → README.md (setup, commands, structure)

Is it about HOW TO WRITE CODE?
  → CONTRIBUTING.md (style, conventions)

Is it a DETAILED GUIDE for a specific topic?
  → docs/<topic>.md

Is it a REPEATABLE PROCEDURE agents should follow?
  → .skills/<name>/SKILL.md
```

### Principles

1. **No duplication** - Each fact lives in one place
2. **Agent behavior vs project knowledge** - AGENTS.md stays lean
3. **README is the entry point** - Links to everything else
4. **Skills are procedures** - Step-by-step, not reference docs

## Agent Skills

This repository uses the [Agent Skills](https://agentskills.io) open standard for cross-platform agent capabilities. Skills are discovered from `.skills/` and provide specialized knowledge for common tasks.

| Skill | Description | Tools |
|-------|-------------|-------|
| [browserless](.skills/browserless/SKILL.md) | Browser automation using Browserless BrowserQL. Use for web scraping, UI testing, screenshot capture, form interaction, content extraction, and any task requiring browser control from sandboxed environments like Claude Code Web. | Read Bash Glob |
| [vercel-deploy](.skills/vercel-deploy/SKILL.md) | Deploy web projects to Vercel. Use when deploying projects, setting up new Vercel projects, configuring environment variables, or troubleshooting deployment issues. | Read Bash Glob |

## Workflow: Plan → Build → Test

**This project enforces a strict human-in-the-loop workflow.** Do not jump straight to implementation.

### Phase 1: Plan

Before writing any code:

1. **Research** - Explore relevant files and understand existing patterns
2. **Propose** - Present a clear, numbered implementation plan
3. **Wait** - Do not proceed until the human approves the plan

Example plan format:
```
## Proposed Plan

1. Create new file `packages/foo/src/bar.ts` with X functionality
2. Update `packages/foo/src/index.ts` to export the new module
3. Add tests in `packages/foo/src/bar.test.ts`

Shall I proceed?
```

### Phase 2: Build

After receiving approval:

1. Implement changes in small, reviewable increments
2. Follow existing code patterns in the codebase
3. Keep changes focused - one logical change at a time

### Phase 3: Test

Before any commit:

1. Run type checking: `pnpm check`
2. Build affected packages: `pnpm b @research/<package-name> build`
3. Verify the build succeeds with no errors
4. Conduct pragmatic e2e testing with real data

## TDD Workflow

For medium to high complexity features, follow Test-Driven Development:

1. **Write failing test** - Define expected behavior first
2. **Confirm it fails** - Verify the test fails for the right reason
3. **Write minimal code** - Just enough to make the test pass
4. **Confirm pass** - Verify the test now passes
5. **Refactor** - Clean up while keeping tests green

## Code Style

- **Match surrounding code style**, even if non-standard
- **Reduce duplication aggressively**
- **All files start with 2-line `// ABOUTME:` comment** describing the file's purpose
- **Names describe domain purpose**, not implementation (`Tool` not `MCPToolWrapper`)
- **No temporal names** (`New`, `Legacy`, `Improved`)
- **Comments explain WHAT/WHY**, never "better than before"

## Testing

- **All failures are your responsibility** - Investigate and fix
- **Never delete failing tests** - Raise with the human first
- **Never test mocked behavior** - Use real data in e2e tests
- **Test output must be pristine** - No warnings, no noise

## Debugging

1. **Read errors carefully**, reproduce consistently
2. **Find working examples**, compare differences
3. **Single hypothesis → minimal change → verify**
4. **Never stack fixes** - If first fix fails, re-analyze from scratch

## Boundaries

### Ask First

- Adding new dependencies
- Creating new packages or projects
- Modifying shared package APIs
- Changes affecting multiple packages
- Architectural decisions
- Rewriting or throwing away existing code

### Never Do

- Commit `.env` or any file containing secrets
- Skip the plan phase for non-trivial changes
- Make breaking API changes without discussion
- Delete failing tests without permission

## Proof of Completion

A task is only complete when:

- [ ] Type checking and test suite passes
- [ ] Build succeeds for affected packages
- [ ] Changes are committed with a clear message
- [ ] Human has reviewed and approved (for PRs)

## References

- [README.md](./README.md) - Project structure, commands, environment setup
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Code style and git workflow
- [docs/cc-web-setup.md](./docs/cc-web-setup.md) - Claude Code Web sessions
- [docs/vercel-deployment.md](./docs/vercel-deployment.md) - Deployment guide
