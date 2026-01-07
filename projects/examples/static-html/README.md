# Static HTML Example

Single HTML file demonstrating CDN-based development with Tailwind CSS. This example shows an interactive visualization—a more complex use case than a typical landing page.

## Preview

Deploy to Vercel and view via the deployment URL:

```bash
./skills/vercel/scripts/setup.sh projects/examples/static-html
./skills/vercel/scripts/push.sh projects/examples/static-html
```

The deployment URL is returned after push. Use [browserless](../../../browserless/) for visual verification and testing.

## What It Demonstrates

- Single-file architecture (no build step)
- Tailwind CSS via CDN
- Interactive JavaScript without frameworks
- SVG-based visualizations
- Complex state management in vanilla JS

## Use Case

This particular example explores how LLMs are restructuring the internet economy. The design document (`CONCEPT.md`) contains the research and planning behind it.

## Creating Your Own

Use the create-project skill:

```bash
./skills/create-project/scripts/create.sh my-project static
```

Or start from the template in `skills/create-project/templates/static/`.
