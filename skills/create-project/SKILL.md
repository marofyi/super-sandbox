# Create Project Skill

Scaffold a new project in the `projects/` directory from templates.

## Usage

```
User: "Create a new static HTML project called my-app"
Agent: [reads this skill, runs create.sh with template type]
```

## Templates

| Template | Description |
|----------|-------------|
| `static` | Single HTML file with Tailwind CSS via CDN |
| `react-cdn` | React 19 + Tailwind via CDN, no build step |
| `next-app` | Full Next.js 16 with TypeScript and Tailwind v4 |

## Script

```bash
./skills/create-project/scripts/create.sh <project-name> <template>
```

## Examples

```bash
# Static HTML project
./skills/create-project/scripts/create.sh landing-page static

# React via CDN
./skills/create-project/scripts/create.sh dashboard react-cdn

# Next.js application
./skills/create-project/scripts/create.sh my-saas next-app
```

## What Each Template Creates

### static

```
projects/<name>/
├── index.html        # Single file with Tailwind CDN
└── README.md
```

### react-cdn

```
projects/<name>/
├── index.html        # React 19 + Tailwind via CDN
└── README.md
```

### next-app

```
projects/<name>/
├── package.json
├── next.config.ts
├── tsconfig.json
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
└── README.md
```

## Post-Creation Steps

After creating a project, deploy it to Vercel for instant previews:

```bash
# First time setup
./skills/vercel/scripts/setup.sh projects/<name>

# Deploy and get preview URL
./skills/vercel/scripts/push.sh projects/<name>
```

The deployment URL is returned after push. Use [browserless](../../browserless/) for visual verification and e2e testing.

### Development Workflow

1. **Edit** — Make changes to your project files
2. **Deploy** — Run `push.sh` to deploy updates (~10s)
3. **Verify** — Use browserless to capture screenshots and test functionality
4. **Iterate** — Repeat until complete
