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
```

### Principles

1. **No duplication** - Each fact lives in one place
2. **Agent behavior vs project knowledge** - AGENTS.md stays lean
3. **README is the entry point** - Links to everything else

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

## HTML vs Webapp

**Default to single-file HTML.** Start with the simplest thing that could work.

```
User requests a tool/demo/prototype?
  → Single HTML file with CDN dependencies
  → No build step, no package.json, no node_modules

Only escalate to a webapp when the user EXPLICITLY needs:
  → Server-side logic or API routes
  → Database connections
  → Authentication with server-side sessions
  → SSR/SSG build-time rendering
  → Dependencies without CDN builds
```

**The threshold is impossibility, not inconvenience.** If it CAN be done in a single HTML file, do it that way. Complex client-side state, multiple components, even React—all work fine via CDN.

**Less is more. Form follows function.** Don't add interactivity or visual polish unless explicitly requested. Interfaces should be usable, minimal, and focused solely on user goals.

See [docs/static-html-guide.md](./docs/static-html-guide.md) for templates and CDN library references.

## Proof of Completion

A task is only complete when:

- [ ] Type checking and test suite passes
- [ ] Build succeeds for affected packages
- [ ] Changes are committed with a clear message
- [ ] Human has reviewed and approved (for PRs)

## Automated Documentation

The `.github/workflows/update-docs.yml` workflow automatically updates documentation on PRs. It uses the Documentation Structure defined above to route content correctly.

**When modifying AGENTS.md**, ensure the workflow agent instructions stay in sync:
- If the Documentation Structure table changes, update the workflow's embedded copy
- If document purposes change, update the workflow's routing rules
- The workflow must reflect the same content boundaries defined here

## References

**Read before acting.** These docs contain critical context. Skipping them causes errors.

| Document | Description | Read Before |
|----------|-------------|-------------|
| [README.md](./README.md) | Project structure, commands, env vars | Running commands, understanding project structure, setting up environment |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Code style, git workflow, PR process | Writing or modifying any code in this repository |
| [docs/browserless.md](./docs/browserless.md) | BrowserQL API, CLI, patterns | Any browser automation, screenshots, scraping, or form interaction |
| [docs/cc-web.md](./docs/cc-web.md) | Network constraints, proxy setup | Working in Claude Code Web or any sandboxed environment |
| [docs/static-html-guide.md](./docs/static-html-guide.md) | Single-file prototypes, GitHub Pages | Creating standalone HTML tools or demos in projects/ |
| [docs/vercel-deployment.md](./docs/vercel-deployment.md) | CLI commands, env vars, GitHub Actions | Deploying to Vercel, adding env vars, or setting up GitHub Actions for deploy |
