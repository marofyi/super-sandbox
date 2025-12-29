# Example Chat Web - Implementation Plan

Blueprint for converting CLI projects to Vercel-hosted web apps.

## Status: Complete ✓

## Overview

Convert `example-chat` CLI demo into a web application with:
- Simple chat UI
- Streaming API responses
- Vercel deployment

## Tech Stack

| Component | Version | Notes |
|-----------|---------|-------|
| Next.js | 16.1 | Latest stable, App Router |
| React | 19 | Required by Next.js 16 |
| Tailwind CSS | 4.x | Styling |
| TypeScript | 5.7+ | Strict mode |

## Implementation Checklist

### Phase 1: Project Structure
- [x] Create `package.json` with workspace deps
- [x] Create `tsconfig.json` extending base
- [x] Create `next.config.ts`
- [x] Create `postcss.config.js` (Tailwind v4 doesn't need tailwind.config)

### Phase 2: API Layer
- [x] Create `/api/chat` route handler with streaming
- [x] Handle errors gracefully
- [x] Support system prompts (optional param)

### Phase 3: UI
- [x] Create root layout with Tailwind
- [x] Create chat page component
- [x] Message list (user/assistant bubbles)
- [x] Input form with send button
- [x] Streaming text display
- [x] Loading/error states

### Phase 4: Vercel Config
- [x] Add `vercel.json` for monorepo
- [x] Document environment variables (`.env.example`)
- [ ] Test with `vercel dev` (requires OPENAI_API_KEY)

### Phase 5: Automation (Future Projects)
- [ ] Document the blueprint process
- [ ] Consider a scaffolding script

## File Structure

```
projects/example-chat-web/
├── PLAN.md                 # This file
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.js
├── vercel.json
├── .env.example
└── app/
    ├── layout.tsx          # Root layout
    ├── page.tsx            # Chat UI (includes message list & input)
    ├── globals.css         # Tailwind imports
    └── api/
        └── chat/
            └── route.ts    # Streaming API
```

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
```

## Commands

```bash
# Development
pnpm --filter @research/example-chat-web dev

# Build
pnpm b @research/example-chat-web build

# Deploy (after Vercel link)
vercel --cwd projects/example-chat-web
```

## Deployment Steps

1. Push code to GitHub
2. Go to vercel.com → Add New Project
3. Import repository
4. Configure:
   - Root Directory: `projects/example-chat-web`
   - Build Command: `pnpm build`
   - Install Command: `pnpm install`
5. Add environment variable: `OPENAI_API_KEY`
6. Deploy

## Notes

- This serves as a blueprint for future `projects/*` web apps
- Each project gets its own Vercel project, same repo
- Shared code lives in `packages/*`
