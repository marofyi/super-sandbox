# next-app

Next.js 16 application with App Router, TypeScript, and Tailwind CSS v4.

## Preview

Deploy to Vercel and view via the deployment URL:

```bash
# First time setup
./skills/vercel/scripts/setup.sh projects/examples/next-app

# Deploy (builds automatically)
./skills/vercel/scripts/push.sh projects/examples/next-app
```

The deployment URL is returned after push. Use [browserless](../../../browserless/) for visual verification and testing.

## Build

For local development (if available):

```bash
pnpm install
pnpm build
```

In cloud sandbox environments, skip local dev and deploy directly to Vercel for instant previews.
