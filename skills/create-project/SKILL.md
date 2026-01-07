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

### Static / React CDN
1. Open `index.html` in browser
2. Edit and refresh

### Next.js
1. `cd projects/<name>`
2. `pnpm install`
3. `pnpm dev`
