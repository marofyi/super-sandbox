# Vercel Deployment Guide

Deploy monorepo projects to Vercel using the CLI.

## Prerequisites

```bash
# Install Vercel CLI globally
pnpm add -g vercel
```

## Authentication

### Option 1: Browser Login (Interactive)
```bash
vercel login
```

### Option 2: Token-Based (Headless/CI)

1. Generate a token at https://vercel.com/account/tokens
2. Use via environment variable or flag:

```bash
# Environment variable
export VERCEL_TOKEN=your_token_here

# Or pass directly
vercel --token=your_token_here
```

## Deploying a Project

```bash
# Navigate to the project
cd projects/example-chat-web

# Deploy to production
vercel --prod --yes

# Or with token explicitly
vercel --prod --yes --token=$VERCEL_TOKEN
```

## Environment Variables

```bash
# Add a secret (interactive prompt for value)
vercel env add OPENAI_API_KEY production

# Or non-interactive (pipe the value)
echo "sk-your-key" | vercel env add OPENAI_API_KEY production

# List env vars
vercel env ls

# Remove an env var
vercel env rm OPENAI_API_KEY production
```

## Monorepo Configuration

Each project in `projects/` gets its own Vercel project. The `vercel.json` in each project configures the build:

```json
{
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "framework": "nextjs"
}
```

## Linking an Existing Project

If the project already exists on Vercel:

```bash
cd projects/example-chat-web
vercel link
```

Follow the prompts to select your team and project.

## Useful Commands

| Command | Description |
|---------|-------------|
| `vercel` | Deploy to preview |
| `vercel --prod` | Deploy to production |
| `vercel ls` | List deployments |
| `vercel logs <url>` | View deployment logs |
| `vercel inspect <url>` | Get deployment details |
| `vercel domains ls` | List domains |
| `vercel env ls` | List environment variables |

## CI/CD Integration

For GitHub Actions or other CI:

```yaml
- name: Deploy to Vercel
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  run: |
    cd projects/example-chat-web
    vercel --prod --yes
```

## Troubleshooting

### "No framework detected"
Ensure `vercel.json` has `"framework": "nextjs"` set.

### Build fails with workspace dependency errors
The `vercel.json` should have `"installCommand": "pnpm install"` to properly resolve workspace packages.

### Token permission errors
Ensure your token has the correct scope (full account access or specific project access).
