# Static HTML Prototypes Guide

Best practices for creating single-file HTML tools and experiments in this repository.

## When to Use Static HTML

| Use Case | Approach |
|----------|----------|
| Quick experiment, single-file tool | Single `.html` file in `projects/` |
| Multi-page app, API routes, SSR | Full project with `package.json` |
| Shared library code | Package in `packages/` |

**Static HTML is ideal for:**
- Interactive demos and visualizations
- Single-purpose utilities (JSON formatter, color picker, etc.)
- Rapid prototyping with LLMs
- Tools that need zero build setup

## File Structure

Place single-file prototypes directly in `projects/`:

```
projects/
├── index.html           # Landing page (auto-maintained)
├── tanstack-chat/       # Full project
├── example-chat-web/    # Full project
├── color-picker.html    # Prototype
└── json-formatter.html  # Prototype
```

## Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Name</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Tool Name</h1>

    <!-- Your content here -->

  </div>

  <script>
    // Your JavaScript here
  </script>
</body>
</html>
```

## Recommended CDN Libraries

### Styling

| Library | CDN URL | Use Case |
|---------|---------|----------|
| **Tailwind CSS** | `https://cdn.tailwindcss.com` | Utility-first styling |
| **Pico CSS** | `https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css` | Classless semantic styling |
| **Water.css** | `https://cdn.jsdelivr.net/npm/water.css@2/out/water.css` | Minimal classless styling |

### JavaScript Frameworks (Lightweight)

| Library | CDN URL | Use Case |
|---------|---------|----------|
| **Alpine.js** | `https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js` | Declarative reactivity |
| **htmx** | `https://unpkg.com/htmx.org@2` | AJAX without writing JS |
| **Petite Vue** | `https://unpkg.com/petite-vue` | Vue-like, 6kb |
| **Preact** | `https://esm.sh/preact` | React-like, 3kb |
| **lit-html** | `https://cdn.jsdelivr.net/npm/lit-html@3/lit-html.js` | Fast templating |

### Utilities

| Library | CDN URL | Use Case |
|---------|---------|----------|
| **Lodash** | `https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js` | Utility functions |
| **Day.js** | `https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js` | Date manipulation |
| **marked** | `https://cdn.jsdelivr.net/npm/marked@12/marked.min.js` | Markdown parsing |
| **Prism.js** | `https://cdn.jsdelivr.net/npm/prismjs@1/prism.min.js` | Syntax highlighting |
| **Chart.js** | `https://cdn.jsdelivr.net/npm/chart.js@4` | Charts and graphs |
| **Mermaid** | `https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js` | Diagrams from text |

### ES Modules from CDN

Use `esm.sh` or `esm.run` to import npm packages as ES modules:

```html
<script type="module">
  import confetti from 'https://esm.sh/canvas-confetti@1';
  confetti();
</script>
```

## Local Preview

### Local Development (Mac/Linux)

```bash
# Quick static server (from repo root)
npx serve projects

# With live reload
npx live-server projects

# Python alternative
python -m http.server 8000 --directory projects
```

### Claude Code Web

The CC Web sandbox is remote—localhost isn't accessible from your browser.

**Options:**
1. **Deploy to GitHub Pages** — Push to main, preview at `https://<user>.github.io/research/`
2. **Read the HTML** — Inspect markup directly with the Read tool

## Deployment

Static HTML files in `projects/` are automatically deployed to GitHub Pages when pushed to `main`:

- **Workflow:** `.github/workflows/deploy-github-pages.yml`
- **URL:** `https://<user>.github.io/research/<filename>.html`

The landing page at `projects/index.html` is automatically updated by the `update-docs.yml` workflow when projects change.

## Best Practices

### Do

- Keep everything in one file (HTML, CSS, JS)
- Use CDN-loaded dependencies (no npm/build step)
- Write minimal, focused code (a few hundred lines max)
- Use semantic HTML elements
- Test across browsers before sharing

### Avoid

- Build steps (webpack, vite, etc.)
- npm dependencies requiring bundling
- React/Vue/Svelte (use Alpine.js or vanilla JS)
- Over-engineering for hypothetical future needs

## When to Graduate to a Full Project

Move from static HTML to a full project in `projects/<name>/` when you need:

- Server-side logic or API routes
- Multiple interconnected pages
- Complex state management
- TypeScript type safety
- SSR or build-time optimization
- Dependencies that don't have CDN builds

## Examples

### Minimal Alpine.js Counter

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Counter</title>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
</head>
<body>
  <div x-data="{ count: 0 }">
    <button @click="count++">Count: <span x-text="count"></span></button>
  </div>
</body>
</html>
```

### Markdown Preview with Tailwind

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
</head>
<body class="bg-gray-100 p-8">
  <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
    <textarea id="input" class="p-4 rounded border h-96 font-mono"># Hello World</textarea>
    <div id="output" class="bg-white p-4 rounded border prose"></div>
  </div>
  <script>
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    const render = () => output.innerHTML = marked.parse(input.value);
    input.addEventListener('input', render);
    render();
  </script>
</body>
</html>
```

## References

- [Simon Willison: HTML tools](https://simonwillison.net/2025/Dec/10/html-tools/) — Inspiration for this workflow
- [Tailwind Play CDN](https://tailwindcss.com/docs/installation/play-cdn)
- [Alpine.js](https://alpinejs.dev/)
- [htmx](https://htmx.org/)
- [esm.sh](https://esm.sh/) — ESM CDN for npm packages

## See Also

- [README.md](../README.md) - Project overview and directory structure
- [docs/vercel-deployment.md](./vercel-deployment.md) - When a full Vercel app is required
- [docs/learnings-log.md](./learnings-log.md) - Prior lessons from static HTML deployments
