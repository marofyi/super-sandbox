---
name: pr-review
description: Review pull requests for this monorepo. Use when analyzing PR changes, reviewing code quality, checking TypeScript patterns, and verifying documentation updates.
allowed-tools: Read Grep Glob Bash
---

# PR Review

Review pull requests for the research monorepo following project standards.

## Checklist

1. **Type Safety** - Verify `pnpm check` passes
2. **Build** - Confirm affected packages build successfully
3. **Patterns** - Check code follows existing TypeScript patterns (strict mode, named exports, explicit types)
4. **Scope** - Ensure changes are focused and atomic
5. **Docs** - Verify README.md and AGENTS.md updated if needed

## Review Commands

```bash
# See what changed
git diff origin/main...HEAD --name-only

# Type check
pnpm check

# Build affected package
pnpm b @research/<package> build
```

## Code Style Reference

```typescript
// Named exports, explicit types
export async function example(input: string): Promise<Result> {
  // ...
}
```

## Red Flags

- Missing type annotations on public APIs
- Default exports instead of named exports
- Secrets or .env files in diff
- Changes to node_modules or dist
- Breaking API changes without discussion
