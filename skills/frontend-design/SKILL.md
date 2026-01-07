# Frontend Design Skill

Create distinctive, production-grade frontend interfaces that avoid generic AI aesthetics.

## Usage

```
User: "Create a landing page for my SaaS product"
Agent: [applies these design principles to create polished UI]
```

## Design Philosophy

This skill is based on [Anthropic's official frontend-design skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md).

### Core Principles

1. **Distinctive Typography**
   - Avoid generic system fonts
   - Use font pairings that create hierarchy
   - Consider variable fonts for flexibility

2. **Cohesive Color Palettes**
   - Build from a primary brand color
   - Include sharp accent colors
   - Ensure sufficient contrast ratios

3. **Purposeful Motion**
   - Animations should communicate state
   - Avoid gratuitous movement
   - Respect `prefers-reduced-motion`

4. **Asymmetric Layouts**
   - Break out of grid monotony
   - Use negative space intentionally
   - Create visual tension and interest

## Anti-Patterns to Avoid

- Generic gradient backgrounds
- Overused rounded corners on everything
- Stock photo hero sections
- Cookie-cutter card layouts
- Excessive shadows and blur effects
- Rainbow gradient text

## Technology Defaults

When no preference is specified:

| Technology | Default |
|------------|---------|
| CSS Framework | Tailwind CSS v4 |
| Component Library | shadcn/ui |
| Icons | Lucide React |
| Fonts | Variable fonts from Google Fonts |

## Implementation Notes

### Static HTML Projects

Use Tailwind Play CDN for rapid prototyping:

```html
<script src="https://cdn.tailwindcss.com"></script>
```

### React/Next.js Projects

Install shadcn/ui components as needed:

```bash
npx shadcn@latest add button card
```

## Examples

### Good: Distinctive Hero

```html
<section class="relative overflow-hidden">
  <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
  <div class="relative max-w-5xl mx-auto px-6 py-24">
    <h1 class="text-6xl font-black tracking-tight text-white">
      Ship faster.<br/>
      <span class="text-purple-400">Sleep better.</span>
    </h1>
  </div>
</section>
```

### Bad: Generic Hero

```html
<!-- Avoid this pattern -->
<section class="bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl p-8">
  <h1 class="text-4xl font-bold text-white text-center">
    Welcome to Our Platform
  </h1>
</section>
```

## Reference

- [Anthropic frontend-design skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
