# Cloud Agent Kit: Open Source Plan

> **Status:** Draft v5 — Ready for final review
> **Last Updated:** 2026-01-06

## Vision

**Cloud Agent Kit** gives cloud AI agents superpowers.

It works around sandbox limitations to enable rapid development and deployment—from static HTML to full-stack web apps—using cloud agents like Claude Code Web, OpenAI Codex, and Gemini CLI Agent Mode.

**For:** Developers, product managers, builders, AI-enthusiasts, and vibe coders who want to build with cloud AI agents.

---

## What It Solves

Cloud agent sandboxes have limitations:
- No persistent filesystem
- Network restrictions (HTTP only, limited domains)
- Missing CLI tools (gh, vercel)
- Session-based workflows

Cloud Agent Kit provides:
- **Auto-setup hooks** — `.claude/` installs tools on session start
- **HTTP-only browser automation** — `@cloud-agent-kit/browserless` works without WebSockets
- **GitHub workaround** — Proxy-aware networking for operations beyond the `/git` path
- **Deployment skill** — Ship to Vercel in seconds
- **Architecture conventions** — Projects, packages, and skills with testing

---

## What Users Build

| Category | Description | Example |
|----------|-------------|---------|
| **Projects** | Apps deployed to users | Dashboards, landing pages, full-stack apps |
| **Packages** | Shared utilities across projects | HTTP clients, helpers, abstractions |

**Why this matters:** This separation enforces good architecture—abstraction layers, DRY principles, shared utilities. Make this explicit in AGENTS.md so casual usage doesn't break structure.

---

## Cloud Environment Support

| Environment | Setup Method | Config Location |
|-------------|--------------|-----------------|
| **Claude Code Web** | Auto (SessionStart hook) | `.claude/settings.json` |
| **OpenAI Codex** | Manual (copy script to UI) | `scripts/codex-setup.sh` |
| **Gemini CLI Agent Mode** | Reads AGENTS.md | Native support |

### Setup Script Installs

```bash
gh        # GitHub CLI for PRs, workflow dispatch
vercel    # Deployments
pnpm      # Package management
```

**Note:** Proxy-aware networking is only needed for GitHub operations outside the `/git` proxy path (workflow dispatch, API calls). See `docs/cc-web.md` for details.

---

## Structure

```
cloud-agent-kit/
├── .claude/
│   ├── settings.json              # SessionStart hook
│   └── scripts/
│       └── setup-web-session.sh   # Installs gh, vercel CLI
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Type-check on PRs
│       ├── update-docs.yml        # AI-powered doc updates
│       └── update-index.yml       # Regenerate index.html
├── scripts/
│   └── codex-setup.sh             # Copy to Codex environment settings
├── docs/
│   ├── cloud-environments.md      # CC Web, Codex, Gemini setup
│   ├── browserless.md             # HTTP browser automation
│   └── static-html-guide.md       # CDN patterns
├── examples/
│   ├── static-html/               # Single HTML file
│   ├── react-cdn/                 # React via CDN, no build
│   └── next-app/                  # Full Next.js (AI Chatbot template)
├── packages/
│   └── browserless/               # HTTP-only browser automation
├── skills/
│   ├── vercel/                    # Deploy to Vercel
│   ├── create-package/            # Scaffold new package
│   ├── create-project/            # Scaffold new project
│   ├── update/                    # Sync from upstream template
│   └── frontend-design/           # Anthropic's design skill (included)
├── AGENTS.md                      # Agent conventions (THE onboarding)
├── CLAUDE.md                      # @AGENTS.md
├── README.md                      # Human discovery
├── LICENSE                        # MIT
├── index.html                     # Project showcase page
└── package.json
```

---

## Skills (v1)

| Skill | Purpose |
|-------|---------|
| `vercel` | Deploy static HTML or full apps to Vercel |
| `create-package` | Scaffold package with conventions, tests |
| `create-project` | Scaffold project (static/react/nextjs) |
| `update` | Sync from upstream Cloud Agent Kit template |
| `frontend-design` | [Anthropic's official skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) for distinctive UI |

### Future Skills

| Skill | Purpose |
|-------|---------|
| `shadcn-ui` | Add/configure shadcn/ui components |

---

## Tech Stack (January 2026)

| Technology | Version | Notes |
|------------|---------|-------|
| **Next.js** | 16.x | `proxy.ts`, Turbopack default, DevTools MCP |
| **React** | 19.x | Required by Next.js 16 |
| **Tailwind CSS** | 4.x | `@import "tailwindcss"`, zero config |
| **shadcn/ui** | Latest | Default for React (not enforced) |
| **Node.js** | 20.9.0+ | Minimum for Next.js 16 |

**Styling default:** shadcn/ui + Tailwind v4. Used if user doesn't specify otherwise.

---

## Index Page & Showcase

`index.html` displays all projects as a visual gallery.

**Hosting options:**
1. **GitHub Pages** — Free for public repos
2. **Vercel** — For private repos (free tier available)

The `update-index.yml` workflow regenerates this page when projects change.

---

## Template Updates

Users get a disconnected copy when using the template.

**Solution:** `update` skill

```
User: "Check for Cloud Agent Kit updates"
Agent: [reads skills/update/SKILL.md]
Agent: Fetches upstream, shows diff, applies updates
Agent: Preserves projects/, *.local.*, custom AGENTS.md sections
```

Referenced in README: "To get updates, ask your agent to 'update Cloud Agent Kit'"

---

## Conventions

### Testing Required

All examples, templates in skills, and packages must have tests.

### Projects vs Packages (Architecture)

**Packages:** Shared utilities, abstraction layers, reusable code
**Projects:** Apps that consume packages, deployed to users

This separation is non-negotiable. AGENTS.md must enforce:
- No business logic duplication across projects
- Common patterns go in packages
- Projects import from packages, not copy code

### Styling

Default: shadcn/ui + Tailwind v4 (not enforced, just default if unspecified)

Design principles (from Anthropic skill):
- Distinctive typography (avoid generic fonts)
- Cohesive color palettes with sharp accents
- Purposeful motion and animations
- Asymmetric, unexpected layouts

---

## Decisions Made

| Question | Decision |
|----------|----------|
| License | MIT (no CODE_OF_CONDUCT or SECURITY.md needed) |
| Next.js example | [AI Chatbot](https://vercel.com/templates/next.js/nextjs-ai-chatbot) from Vercel |
| Demo video | Yes, for README |
| Documentation | GitHub markdown only |
| Community | GitHub Discussions only |
| npm publish | No |
| Versioning | Semver from v0.1.0 |

---

## Phase Plan

### Phase 1: Fresh Repo
- Create `cloud-agent-kit` repo (template enabled)
- Add MIT LICENSE
- Copy and adapt AGENTS.md, CONTRIBUTING.md

### Phase 2: Core Content
- Migrate `packages/browserless/`
- Migrate `skills/vercel/`
- Add `.claude/` setup hooks
- Add `scripts/codex-setup.sh`
- Update package names to `@cloud-agent-kit/*`

### Phase 3: New Skills
- Create `skills/create-package/`
- Create `skills/create-project/`
- Create `skills/update/`
- Include `skills/frontend-design/` (Anthropic's)

### Phase 4: Examples
- Create `examples/static-html/`
- Create `examples/react-cdn/`
- Create `examples/next-app/` (AI Chatbot)
- All with tests

### Phase 5: Documentation & Polish
- Rewrite README.md
- Create `docs/cloud-environments.md`
- Add `index.html` + `update-index.yml`
- Record demo video
- Fresh clone test

### Phase 6: Launch
- Set repo public
- Create v0.1.0 release
- Enable GitHub Discussions
- Announce

---

## Sources

- [Anthropic frontend-design skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
- [actions-template-sync](https://github.com/AndreasAugustin/actions-template-sync) (reference for update skill)
- [Vercel AI Chatbot template](https://vercel.com/templates/next.js/nextjs-ai-chatbot)
- [Next.js 16](https://nextjs.org/blog/next-16)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui](https://ui.shadcn.com/)
- [Codex Cloud Environments](https://developers.openai.com/codex/cloud/environments/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| Draft v1 | 2026-01-06 | Initial plan |
| Draft v2 | 2026-01-06 | Cloud setup strategy, skills concept |
| Draft v3 | 2026-01-06 | Template updates, progressive disclosure |
| Draft v4 | 2026-01-06 | Tech stack, Anthropic skill reference |
| Draft v5 | 2026-01-06 | **Major rewrite:** Focused scope, single persona (cloud agent users), resolved all open questions, simplified governance (MIT only), added Gemini CLI, enforced architecture conventions, testing requirement, index.html showcase options |

## See Also

- [README.md](../README.md) - Project overview and navigation
- [docs/cloud-agent-kit-research.md](./cloud-agent-kit-research.md) - Competitive research and UX patterns informing this plan
