# ebm-papst Style Guide

Reference for creating a landing page that matches ebm-papst's corporate identity.

## Screenshots

- `ebm-papst-screenshot.jpg` - Desktop viewport (1920x1080)
- `ebm-papst-fullpage.jpg` - Full page capture

## Brand Colors

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **ebm-papst Blue** | `#0075BE` | Primary brand color, header/navigation, links, buttons |
| **ebm-papst Dark Blue** | `#005A92` | Hover states, secondary elements |
| **White** | `#FFFFFF` | Backgrounds, text on dark backgrounds |

### Accent Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Amber/Gold** | `#F0AB00` | Highlight banners, feature callouts (NEXAIRA branding) |
| **Orange** | `#FF9900` | Secondary accent, hover states on amber |

### Neutral Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Charcoal** | `#333333` | Primary body text |
| **Medium Gray** | `#666666` | Secondary text |
| **Light Gray** | `#F5F5F5` | Section backgrounds, borders |
| **Border Gray** | `#E0E0E0` | Dividers, card borders |

## Typography

### Font Family
- **Primary**: Clean sans-serif system stack
- **Fallback**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

### Font Hierarchy

| Element | Style |
|---------|-------|
| **H1 (Hero)** | 48-56px, Bold, Italic for emphasis |
| **H2 (Section)** | 32-40px, Regular/Light, Italic taglines |
| **H3 (Card titles)** | 24px, Medium |
| **Body** | 16px, Regular, line-height 1.5 |
| **Navigation** | 14-16px, Medium |
| **Meta/Small** | 12-14px, Regular |

## Layout Patterns

### Header/Navigation
- Fixed header with white background
- Logo top-left with tagline "engineering a better life" in amber banner
- Two-tier navigation:
  - Top: Utility links (Presse, Karriere, DXP, Kontakt, Downloads)
  - Main: Primary nav (Produkte, Branchen, Unternehmen, Newsroom, Support)
- Search icon and globe (language selector) on right
- Primary nav links in ebm-papst Blue

### Hero Section
- Full-width background image or gradient
- Bold headline with amber/gold background highlight
- Italic tagline text
- Primary CTA button (blue with white text, rounded corners)

### Content Cards
- 4-column grid on desktop
- Image + text combination
- Clean white cards with subtle shadows
- Equal height cards in rows

### Section Titles
- Centered, italic text
- Medium gray color
- "Willkommen in der Welt der..." welcome style

## UI Components

### Buttons

**Primary Button:**
```css
.btn-primary {
  background-color: #0075BE;
  color: #FFFFFF;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-weight: 500;
  transition: background-color 0.2s;
}
.btn-primary:hover {
  background-color: #005A92;
}
```

**Text Link with Arrow:**
```css
.link-arrow {
  color: #0075BE;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.link-arrow::after {
  content: "›";
  font-size: 1.2em;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}
.card-image {
  aspect-ratio: 16/9;
  object-fit: cover;
}
.card-content {
  padding: 16px;
}
```

### Navigation

```css
.nav-primary a {
  color: #0075BE;
  text-decoration: none;
  font-weight: 500;
  padding: 16px 24px;
}
.nav-utility a {
  color: #333333;
  font-size: 14px;
}
```

## Visual Style

### Overall Aesthetic
- **Corporate modern** - Professional, clean, trustworthy
- **B2B focused** - Technical but approachable
- **Minimal decoration** - Function over form
- **Generous whitespace** - Uncluttered layouts

### Photography Style
- Industrial/technical subjects
- Professional studio lighting
- Blue color temperature bias
- Products in context (hands, workspaces)
- Abstract technology imagery (data centers, networks)

### Iconography
- Simple line icons
- Consistent stroke weight
- Blue or gray colors

## Responsive Breakpoints

| Breakpoint | Width | Columns |
|------------|-------|---------|
| Mobile | < 768px | 1 |
| Tablet | 768-1024px | 2 |
| Desktop | 1024-1440px | 3-4 |
| Large Desktop | > 1440px | 4 |

## Key Brand Elements

### Logo
- "ebmpapst" wordmark in dark blue
- "engineering a better life" tagline in white on amber background banner
- SVG format for scalability

### Tagline
- "engineering a better life"
- Always displayed on amber/gold background
- Located below logo in header

### Product Branding
- **NEXAIRA** - Air, Heating and Cooling Technology line
- **CompaNamic** - Product/technology line
- Uses amber highlight boxes for product names

## Footer

- Dark background (charcoal/dark gray)
- Multi-column layout
- White text with links
- Social media icons
- Legal/compliance links

## Accessibility Notes

- High contrast text (WCAG AA compliant)
- Clear visual hierarchy
- Semantic HTML structure
- Descriptive alt text for images
- Focus states on interactive elements
