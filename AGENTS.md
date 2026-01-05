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

### Cross-References (Navigation)

Think of documentation like a website: clear entry points and internal links that guide readers to what they need.

**Entry Points:**
- `README.md` — Homepage for humans (project overview, setup, links to everything)
- `AGENTS.md` — Homepage for AI agents (behavior rules, References table)

**Every doc should:**
1. **Link to related docs** — Add a "See Also" or "Related" section at the bottom
2. **Link upward** — Reference parent/overview docs (e.g., `docs/*.md` should link back to README)
3. **Link sideways** — Connect docs that are often used together (e.g., browserless ↔ cc-web)
4. **Nudge the reader** — Anticipate what they'll need next and provide the path

**Cross-reference patterns:**
```markdown
## See Also
- [README.md](../README.md) - Project overview
- [Related Topic](./related-topic.md) - When you also need X
```

**When adding or updating docs:**
- Check if new content should link to existing docs
- Check if existing docs should link to new content
- Update the References table in AGENTS.md if adding a new guide
- Update the Documentation table in README.md for new docs

**Navigation principle:** A reader should never hit a dead end. From any doc, they should be able to find their way to related information or back to an entry point.

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

## Token Handling (CC Web)

- Use only `GH_TOKEN` with `actions:write` scope for `gh workflow run`; never request broader scopes.
- Keep `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID_*` in GitHub Secrets. Do not surface them in shells or logs.
- `BROWSERLESS_TOKEN` is the only API token expected in CC Web; avoid printing or echoing it.
- No PreToolUse security hook is active; avoid env dumps or token prints yourself.
- Review [docs/cc-web.md](./docs/cc-web.md) for the token architecture and network constraints.

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

The `.github/workflows/update-docs.yml` and `.github/workflows/update-index.yml` workflows keep docs and the landing page current. They accept `workflow_dispatch` inputs `pr_number` (target a closed PR) and `commits_back` (default 5) when no PR context is available, set `BASE_REF` and `HAS_PR_CONTEXT` to pick the correct diff target, and checkout the PR head SHA when provided. Manual dispatches always create a fresh `docs/` branch (with PR number suffix when given) before pushing.

`update-docs.yml` now asks for CHANGELOG updates (Keep a Changelog) instead of `docs/learnings-log.md`.

**When modifying AGENTS.md**, ensure the workflow agent instructions stay in sync:
- If the Documentation Structure table changes, update the workflow's embedded copy
- If document purposes change, update the workflow's routing rules
- Preserve the branching and commit expectations: use `docs:`-prefixed commit subjects so the push step runs, and keep the workflow aligned with the content boundaries defined here

## Skills

Reusable capabilities for common tasks. Skills are located in `skills/` and follow the [Agent Skills](https://agentskills.io) specification.

| Skill | Description |
|-------|-------------|
| [vercel](./skills/vercel/) | Deploy and manage projects on Vercel. Setup, push, list, inspect, logs, env vars, rollback, teardown. |

## References

**Read before acting.** These docs contain critical context. Skipping them causes errors.

| Document | Description | Read Before |
|----------|-------------|-------------|
| [README.md](./README.md) | Project structure, commands, env vars | Running commands, understanding project structure, setting up environment |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Code style, git workflow, PR process | Writing or modifying any code in this repository |
| [CHANGELOG.md](./CHANGELOG.md) | Notable changes and discoveries | Investigating regressions or understanding recent updates |
| [docs/browserless.md](./docs/browserless.md) | BrowserQL API, CLI, patterns | Any browser automation, screenshots, scraping, or form interaction |
| [docs/cc-web.md](./docs/cc-web.md) | Network constraints, proxy setup, token architecture | Working in Claude Code Web or any sandboxed environment |
| [docs/static-html-guide.md](./docs/static-html-guide.md) | Single-file prototypes, GitHub Pages | Creating standalone HTML tools or demos in projects/ |
| [docs/vercel-deployment.md](./docs/vercel-deployment.md) | CLI commands, env vars, GitHub Actions | Deploying to Vercel, adding env vars, or setting up GitHub Actions for deploy |
