# AGENTS.md

Instructions for AI coding agents working in this repository.

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

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install all dependencies |
| `pnpm check` | Type-check all packages (must pass before commits) |
| `pnpm b @research/<pkg> build` | Build a specific package |
| `pnpm --filter @research/<pkg> start` | Run a project |

## Project Structure

```
research/
├── packages/           # Shared utilities (publishable)
│   └── openai-utils/   # OpenAI API wrapper
├── projects/           # Research projects (use packages)
│   └── example-chat/   # Demo project
├── .env                # API keys (never commit)
└── .env.example        # Template for environment setup
```

## Boundaries

### Always Do

- Run `pnpm check` before committing
- Follow existing TypeScript patterns (strict mode enabled)
- Use existing utilities from `packages/` when available
- Keep commits atomic and focused

### Ask First

- Adding new dependencies
- Creating new packages or projects
- Modifying shared package APIs
- Changes affecting multiple packages
- Architectural decisions

### Never Do

- Commit `.env` or any file containing secrets
- Skip the plan phase for non-trivial changes
- Push directly to main without PR review
- Modify `node_modules/` or `dist/` directories
- Make breaking API changes without discussion

## Code Style

```typescript
// Use explicit types for function signatures
export async function chat(
  prompt: string,
  options?: ChatOptions
): Promise<ChatResponse> {
  // ...
}

// Prefer async/await over raw promises
const result = await ask('question');

// Use named exports, not default exports
export { ask, chat, chatStream };
```

## Git Workflow

1. Work on feature branches, never directly on main
2. Write clear, descriptive commit messages
3. Ensure `pnpm check` passes before committing
4. Create PRs for human review before merging

## Proof of Completion

A task is only complete when:

- [ ] Type checking passes (`pnpm check`)
- [ ] Build succeeds for affected packages
- [ ] Changes are committed with a clear message
- [ ] Human has reviewed and approved (for PRs)

## Claude Code for Web Sessions

This project supports Claude Code for Web, which runs in an ephemeral sandbox environment.

### Automatic Setup

A SessionStart hook (`.claude/settings.json`) automatically runs `.claude/scripts/setup-web-session.sh` on new web sessions. This installs:

- **GitHub CLI (`gh`)** - Required for PR operations

### Environment Detection

Scripts can detect web sessions via:

```bash
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  # Running in web sandbox
fi
```

### Extending the Setup

To add more tools to web sessions, edit `.claude/scripts/setup-web-session.sh`:

```bash
# Example: Add another tool
if ! command -v mytool &> /dev/null; then
  echo "Installing mytool..."
  # installation commands
fi
```

### Limitations

- Environment is ephemeral (tools reinstalled each session)
- Write access limited to project directory
- Some network domains require approval
