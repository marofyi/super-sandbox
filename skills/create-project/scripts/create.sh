#!/bin/bash
# Create Project Script
# Usage: ./skills/create-project/scripts/create.sh <project-name> <template>
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <project-name> <template>"
  echo ""
  echo "Templates:"
  echo "  static     - Single HTML file with Tailwind CSS"
  echo "  react-cdn  - React 19 + Tailwind via CDN"
  echo "  next-app   - Full Next.js 16 application"
  echo ""
  echo "Example: $0 my-app static"
  exit 1
fi

PROJECT_NAME="$1"
TEMPLATE="$2"
PROJECT_DIR="$REPO_ROOT/projects/$PROJECT_NAME"

if [ -d "$PROJECT_DIR" ]; then
  echo "Error: Project directory already exists: $PROJECT_DIR"
  exit 1
fi

case "$TEMPLATE" in
  static)
    echo "Creating static HTML project: $PROJECT_NAME"
    mkdir -p "$PROJECT_DIR"

    cat > "$PROJECT_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PROJECT_NAME</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">PROJECT_NAME</h1>
    <p class="text-gray-600">Edit this file to build your project.</p>
  </div>
</body>
</html>
EOF
    sed -i '' "s/PROJECT_NAME/$PROJECT_NAME/g" "$PROJECT_DIR/index.html" 2>/dev/null || \
    sed -i "s/PROJECT_NAME/$PROJECT_NAME/g" "$PROJECT_DIR/index.html"

    cat > "$PROJECT_DIR/README.md" << EOF
# $PROJECT_NAME

Static HTML project.

## Development

Open \`index.html\` in your browser.
EOF
    ;;

  react-cdn)
    echo "Creating React CDN project: $PROJECT_NAME"
    mkdir -p "$PROJECT_DIR"

    cat > "$PROJECT_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PROJECT_NAME</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div id="root"></div>

  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client"
    }
  }
  </script>

  <script type="module">
    import React from 'react';
    import { createRoot } from 'react-dom/client';

    const { useState } = React;

    function App() {
      const [count, setCount] = useState(0);

      return React.createElement('div', { className: 'max-w-4xl mx-auto px-4 py-12' },
        React.createElement('h1', { className: 'text-4xl font-bold text-gray-900 mb-4' }, 'PROJECT_NAME'),
        React.createElement('p', { className: 'text-gray-600 mb-6' }, 'React 19 via CDN with Tailwind CSS'),
        React.createElement('div', { className: 'flex items-center gap-4' },
          React.createElement('button', {
            className: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700',
            onClick: () => setCount(c => c + 1)
          }, 'Count: ' + count)
        )
      );
    }

    createRoot(document.getElementById('root')).render(React.createElement(App));
  </script>
</body>
</html>
EOF
    sed -i '' "s/PROJECT_NAME/$PROJECT_NAME/g" "$PROJECT_DIR/index.html" 2>/dev/null || \
    sed -i "s/PROJECT_NAME/$PROJECT_NAME/g" "$PROJECT_DIR/index.html"

    cat > "$PROJECT_DIR/README.md" << EOF
# $PROJECT_NAME

React 19 via CDN with Tailwind CSS. No build step required.

## Development

Open \`index.html\` in your browser.

## Features

- React 19 from esm.sh
- Tailwind CSS from CDN
- No build tools needed
- Edit and refresh
EOF
    ;;

  next-app)
    echo "Creating Next.js project: $PROJECT_NAME"
    mkdir -p "$PROJECT_DIR/app"

    cat > "$PROJECT_DIR/package.json" << EOF
{
  "name": "$PROJECT_NAME",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
EOF

    cat > "$PROJECT_DIR/next.config.ts" << 'EOF'
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
EOF

    cat > "$PROJECT_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

    cat > "$PROJECT_DIR/app/globals.css" << 'EOF'
@import "tailwindcss";
EOF

    cat > "$PROJECT_DIR/app/layout.tsx" << EOF
// ABOUTME: Root layout for $PROJECT_NAME
// ABOUTME: Provides HTML structure and global styles

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '$PROJECT_NAME',
  description: 'Built with Super Sandbox',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
EOF

    cat > "$PROJECT_DIR/app/page.tsx" << EOF
// ABOUTME: Home page for $PROJECT_NAME
// ABOUTME: Main entry point for the application

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">$PROJECT_NAME</h1>
      <p className="text-gray-600">
        Next.js 16 with App Router, TypeScript, and Tailwind CSS v4.
      </p>
    </main>
  );
}
EOF

    cat > "$PROJECT_DIR/README.md" << EOF
# $PROJECT_NAME

Next.js 16 application with App Router, TypeScript, and Tailwind CSS v4.

## Development

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

## Build

\`\`\`bash
pnpm build
pnpm start
\`\`\`
EOF
    ;;

  *)
    echo "Error: Unknown template '$TEMPLATE'"
    echo "Available templates: static, react-cdn, next-app"
    exit 1
    ;;
esac

echo ""
echo "Project created: projects/$PROJECT_NAME"
echo ""
if [ "$TEMPLATE" = "next-app" ]; then
  echo "Next steps:"
  echo "  1. cd projects/$PROJECT_NAME"
  echo "  2. pnpm install"
  echo "  3. pnpm dev"
else
  echo "Next steps:"
  echo "  Open projects/$PROJECT_NAME/index.html in your browser"
fi
