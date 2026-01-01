# Contributing

Guidelines for contributing to this repository.

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

### TypeScript

- Strict mode is enabled
- Use explicit types for function signatures
- Prefer `async/await` over raw promises
- Use named exports, not default exports

## Git Workflow

1. Work on feature branches, never directly on main
2. Write clear, descriptive commit messages
3. Ensure `pnpm check` passes before committing
4. Create PRs for human review before merging

## Pull Request Process

1. Run `pnpm check` to verify type checking passes
2. Build affected packages: `pnpm b @research/<pkg> build`
3. Commit with a clear, descriptive message
4. Open a PR for review

## Adding Dependencies

Before adding new dependencies:

1. Check if existing utilities in `packages/` can solve the problem
2. Prefer well-maintained packages with minimal sub-dependencies
3. Ask before adding if unsure

## See Also

- [README.md](./README.md) - Project overview and setup
- [AGENTS.md](./AGENTS.md) - Instructions for AI coding agents
