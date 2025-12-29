# Browser Automation with Stagehand + Steel on Google Cloud

This guide covers setting up AI-powered browser automation for web app development and QA using:

- **Stagehand** - AI browser automation framework with natural language commands
- **Steel** - Open-source headless browser API
- **Google Cloud Run** - Free-tier serverless container hosting

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Your Development Environment                     │
│                      (Local machine or Claude Code Web)                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐         ┌──────────────────────────────────┐     │
│   │   Your Code      │         │   Stagehand SDK                  │     │
│   │                  │         │                                  │     │
│   │  - Test scripts  │ ──────► │  - act("click login button")    │     │
│   │  - QA automation │         │  - extract({ schema })          │     │
│   │  - Web scraping  │         │  - observe()                    │     │
│   └──────────────────┘         └───────────────┬──────────────────┘     │
│                                                │                         │
└────────────────────────────────────────────────┼─────────────────────────┘
                                                 │
                                                 │ CDP (Chrome DevTools Protocol)
                                                 │ wss://steel-xxx.run.app
                                                 │
┌────────────────────────────────────────────────┼─────────────────────────┐
│                      Google Cloud Run                                    │
├────────────────────────────────────────────────┼─────────────────────────┤
│                                                ▼                         │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │                     Steel Browser                             │      │
│   │                                                               │      │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │      │
│   │   │  REST API   │  │  CDP Server │  │  Chrome Browser     │  │      │
│   │   │  :3000      │  │  :9222      │  │  - Screenshots      │  │      │
│   │   │             │  │             │  │  - Console logs     │  │      │
│   │   │  /sessions  │  │  WebSocket  │  │  - DOM access       │  │      │
│   │   │  /scrape    │  │  connection │  │  - Network events   │  │      │
│   │   │  /screenshot│  │             │  │                     │  │      │
│   │   └─────────────┘  └─────────────┘  └─────────────────────┘  │      │
│   │                                                               │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
│   - Scales to zero when idle (free tier friendly)                       │
│   - Cold start: ~10-30 seconds                                          │
│   - 2GB RAM, 1 vCPU                                                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Google Cloud account (free tier works)
- Node.js 18+ (for Stagehand SDK)
- OpenAI API key (for AI-powered automation)

## Part 1: Google Cloud Setup

### 1.1 Create a GCP Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown (top left) → **"NEW PROJECT"**
3. Enter project name: `steel-browser`
4. Click **"CREATE"**
5. Note your **Project ID** (e.g., `steel-browser-438521`)

### 1.2 Enable Cloud Run API

1. Go to [Cloud Run API](https://console.cloud.google.com/apis/library/run.googleapis.com)
2. Ensure your project is selected
3. Click **"ENABLE"**

### 1.3 Create Service Account

1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"+ CREATE SERVICE ACCOUNT"**
3. Fill in:
   - **Name:** `steel-deployer`
   - **Description:** `Deploy Steel Browser to Cloud Run`
4. Click **"CREATE AND CONTINUE"**
5. Add roles:
   - `Cloud Run Admin`
   - `Service Account User`
6. Click **"CONTINUE"** → **"DONE"**

### 1.4 Create JSON Key

1. Click on your service account (`steel-deployer@...`)
2. Go to **"KEYS"** tab
3. Click **"ADD KEY"** → **"Create new key"**
4. Select **JSON** → Click **"CREATE"**
5. Save the downloaded file securely

### 1.5 Configure Environment

For **local development**, add to your `.env`:

```bash
GCP_PROJECT_ID=steel-browser-438521
GCP_SA_KEY='{"type":"service_account","project_id":"steel-browser-438521",...}'
```

For **Claude Code Web**, add these as secrets in Claude Code settings.

## Part 2: Deploy Steel to Cloud Run

### 2.1 Install gcloud CLI

If not already installed:

```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
```

### 2.2 Authenticate (Non-Interactive)

```bash
# Write service account key to temp file
echo "$GCP_SA_KEY" > /tmp/gcp-key.json

# Authenticate
gcloud auth activate-service-account --key-file=/tmp/gcp-key.json

# Set project
gcloud config set project "$GCP_PROJECT_ID"

# Clean up
rm /tmp/gcp-key.json
```

### 2.3 Deploy Steel Browser

```bash
gcloud run deploy steel-browser \
  --image ghcr.io/steel-dev/steel-browser:latest \
  --port 3000 \
  --memory 2Gi \
  --cpu 1 \
  --timeout 3600 \
  --allow-unauthenticated \
  --region us-central1 \
  --quiet
```

### 2.4 Get Service URL

```bash
STEEL_URL=$(gcloud run services describe steel-browser \
  --region us-central1 \
  --format 'value(status.url)')

echo "Steel Browser URL: $STEEL_URL"
```

Example output: `https://steel-browser-abcd1234-uc.a.run.app`

### 2.5 Verify Deployment

```bash
# Check health
curl "$STEEL_URL/health"

# Should return: {"status":"ok"}
```

## Part 3: Stagehand Setup

### 3.1 Install Dependencies

```bash
npm install openai @browserbase/stagehand zod
```

### 3.2 Basic Configuration

```typescript
// src/browser.ts
import { Stagehand } from "@browserbase/stagehand";
import { z } from "zod";

const STEEL_URL = process.env.STEEL_URL!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export async function createBrowser() {
  const stagehand = new Stagehand({
    env: "LOCAL",
    localBrowserLaunchOptions: {
      cdpUrl: `${STEEL_URL.replace("https://", "wss://")}/cdp`,
    },
    modelName: "openai/gpt-5.2",
    modelClientOptions: {
      apiKey: OPENAI_API_KEY,
    },
    verbose: 1, // 0=silent, 1=info, 2=debug
  });

  await stagehand.init();
  return stagehand;
}
```

### 3.3 Environment Variables

Add to `.env`:

```bash
STEEL_URL=https://steel-browser-abcd1234-uc.a.run.app
OPENAI_API_KEY=sk-...
```

## Part 4: Usage Examples

### 4.1 Basic Navigation and Interaction

```typescript
import { createBrowser } from "./browser";

async function example() {
  const stagehand = await createBrowser();

  try {
    // Navigate to a page
    await stagehand.page.goto("https://example.com");

    // Take a screenshot
    await stagehand.page.screenshot({ path: "screenshot.png" });

    // Use natural language to interact
    await stagehand.act("click the 'More information' link");

    // Wait for navigation
    await stagehand.page.waitForLoadState("networkidle");

    console.log("Current URL:", stagehand.page.url());
  } finally {
    await stagehand.close();
  }
}
```

### 4.2 Extract Structured Data

```typescript
import { z } from "zod";
import { createBrowser } from "./browser";

const ProductSchema = z.object({
  name: z.string(),
  price: z.string(),
  description: z.string(),
  inStock: z.boolean(),
});

async function scrapeProduct(url: string) {
  const stagehand = await createBrowser();

  try {
    await stagehand.page.goto(url);

    const product = await stagehand.extract({
      instruction: "Extract the product details from this page",
      schema: ProductSchema,
    });

    console.log("Product:", product);
    return product;
  } finally {
    await stagehand.close();
  }
}
```

### 4.3 Form Filling and Submission

```typescript
async function fillContactForm() {
  const stagehand = await createBrowser();

  try {
    await stagehand.page.goto("https://example.com/contact");

    // Fill form using natural language
    await stagehand.act('fill in the name field with "John Doe"');
    await stagehand.act('fill in the email field with "john@example.com"');
    await stagehand.act('fill in the message field with "Hello, this is a test message"');

    // Submit
    await stagehand.act("click the submit button");

    // Verify success
    const result = await stagehand.extract({
      instruction: "Check if the form was submitted successfully",
      schema: z.object({
        success: z.boolean(),
        message: z.string().optional(),
      }),
    });

    return result;
  } finally {
    await stagehand.close();
  }
}
```

### 4.4 Visual QA Testing

```typescript
async function qaTest(url: string, checks: string[]) {
  const stagehand = await createBrowser();
  const results: { check: string; passed: boolean; details: string }[] = [];

  try {
    await stagehand.page.goto(url);

    for (const check of checks) {
      const result = await stagehand.extract({
        instruction: `Verify: ${check}. Return whether this check passes and explain why.`,
        schema: z.object({
          passed: z.boolean(),
          details: z.string(),
        }),
      });

      results.push({ check, ...result });
    }

    return results;
  } finally {
    await stagehand.close();
  }
}

// Usage
const qaResults = await qaTest("https://myapp.com", [
  "The page has a visible login button",
  "The navigation menu has at least 4 items",
  "There are no broken images on the page",
  "The footer contains copyright information",
]);
```

### 4.5 Multi-Step Workflow

```typescript
async function checkoutFlow() {
  const stagehand = await createBrowser();

  try {
    // Step 1: Navigate to product
    await stagehand.page.goto("https://shop.example.com");
    await stagehand.act("search for 'wireless headphones'");
    await stagehand.act("click on the first product result");

    // Step 2: Add to cart
    await stagehand.act("select size Medium if available");
    await stagehand.act("click Add to Cart");

    // Step 3: Go to checkout
    await stagehand.act("click on the cart icon");
    await stagehand.act("click Proceed to Checkout");

    // Step 4: Verify cart contents
    const cartInfo = await stagehand.extract({
      instruction: "Extract the cart summary",
      schema: z.object({
        itemCount: z.number(),
        subtotal: z.string(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            price: z.string(),
          })
        ),
      }),
    });

    console.log("Cart:", cartInfo);
    return cartInfo;
  } finally {
    await stagehand.close();
  }
}
```

### 4.6 Observe Available Actions

```typescript
async function discoverActions(url: string) {
  const stagehand = await createBrowser();

  try {
    await stagehand.page.goto(url);

    // Discover what actions are available
    const actions = await stagehand.observe({
      instruction: "What interactive elements are on this page?",
    });

    console.log("Available actions:", actions);
    return actions;
  } finally {
    await stagehand.close();
  }
}
```

## Part 5: Advanced Configuration

### 5.1 Session Persistence (Steel API)

For workflows requiring login persistence:

```typescript
import { Stagehand } from "@browserbase/stagehand";

const STEEL_URL = process.env.STEEL_URL!;

// Create a persistent session via Steel API
async function createPersistentSession() {
  const response = await fetch(`${STEEL_URL}/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeout: 3600000, // 1 hour
    }),
  });

  const session = await response.json();
  return session.id;
}

// Connect Stagehand to existing session
async function connectToSession(sessionId: string) {
  const stagehand = new Stagehand({
    env: "LOCAL",
    localBrowserLaunchOptions: {
      cdpUrl: `${STEEL_URL.replace("https://", "wss://")}/sessions/${sessionId}/cdp`,
    },
    modelName: "openai/gpt-5.2",
    modelClientOptions: {
      apiKey: process.env.OPENAI_API_KEY!,
    },
  });

  await stagehand.init();
  return stagehand;
}

// Release session when done
async function releaseSession(sessionId: string) {
  await fetch(`${STEEL_URL}/v1/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
```

### 5.2 Screenshot and Console Logging

```typescript
async function debugSession() {
  const stagehand = await createBrowser();

  // Capture console logs
  stagehand.page.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // Capture page errors
  stagehand.page.on("pageerror", (error) => {
    console.error(`[Page Error] ${error.message}`);
  });

  try {
    await stagehand.page.goto("https://example.com");

    // Take full-page screenshot
    await stagehand.page.screenshot({
      path: "full-page.png",
      fullPage: true,
    });

    // Take element screenshot
    const element = await stagehand.page.$("header");
    if (element) {
      await element.screenshot({ path: "header.png" });
    }
  } finally {
    await stagehand.close();
  }
}
```

### 5.3 Network Interception

```typescript
async function interceptRequests() {
  const stagehand = await createBrowser();

  // Log all network requests
  stagehand.page.on("request", (request) => {
    console.log(`>> ${request.method()} ${request.url()}`);
  });

  stagehand.page.on("response", (response) => {
    console.log(`<< ${response.status()} ${response.url()}`);
  });

  // Block specific resources (e.g., analytics)
  await stagehand.page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.includes("analytics") || url.includes("tracking")) {
      route.abort();
    } else {
      route.continue();
    }
  });

  await stagehand.page.goto("https://example.com");
  await stagehand.close();
}
```

### 5.4 Custom Viewport and Device Emulation

```typescript
async function mobileTest() {
  const stagehand = new Stagehand({
    env: "LOCAL",
    localBrowserLaunchOptions: {
      cdpUrl: `${process.env.STEEL_URL!.replace("https://", "wss://")}/cdp`,
      viewport: {
        width: 375,
        height: 812,
      },
    },
    modelName: "openai/gpt-5.2",
    modelClientOptions: {
      apiKey: process.env.OPENAI_API_KEY!,
    },
  });

  await stagehand.init();

  // Set mobile user agent
  await stagehand.page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
  });

  await stagehand.page.goto("https://example.com");

  // Test mobile-specific UI
  const mobileMenu = await stagehand.extract({
    instruction: "Is there a hamburger menu visible?",
    schema: z.object({
      hasHamburgerMenu: z.boolean(),
      menuLocation: z.string().optional(),
    }),
  });

  console.log("Mobile UI:", mobileMenu);
  await stagehand.close();
}
```

## Part 6: Integration Patterns

### 6.1 Jest Test Integration

```typescript
// __tests__/e2e/checkout.test.ts
import { Stagehand } from "@browserbase/stagehand";
import { z } from "zod";

describe("Checkout Flow", () => {
  let stagehand: Stagehand;

  beforeAll(async () => {
    stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl: `${process.env.STEEL_URL!.replace("https://", "wss://")}/cdp`,
      },
      modelName: "openai/gpt-5.2",
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY!,
      },
    });
    await stagehand.init();
  }, 60000); // 60s timeout for cold start

  afterAll(async () => {
    await stagehand.close();
  });

  test("can add item to cart", async () => {
    await stagehand.page.goto("https://shop.example.com/products/1");

    await stagehand.act("click Add to Cart button");

    const cartBadge = await stagehand.extract({
      instruction: "What number is shown on the cart icon badge?",
      schema: z.object({ count: z.number() }),
    });

    expect(cartBadge.count).toBe(1);
  }, 30000);

  test("cart persists across pages", async () => {
    await stagehand.page.goto("https://shop.example.com/");

    const cartBadge = await stagehand.extract({
      instruction: "What number is shown on the cart icon badge?",
      schema: z.object({ count: z.number() }),
    });

    expect(cartBadge.count).toBe(1);
  }, 30000);
});
```

### 6.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests
        env:
          STEEL_URL: ${{ secrets.STEEL_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npm run test:e2e
```

### 6.3 Utility Wrapper

```typescript
// src/utils/browser-automation.ts
import { Stagehand } from "@browserbase/stagehand";
import { z, ZodSchema } from "zod";

export class BrowserAutomation {
  private stagehand: Stagehand | null = null;

  async connect(): Promise<void> {
    if (this.stagehand) return;

    this.stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl: `${process.env.STEEL_URL!.replace("https://", "wss://")}/cdp`,
      },
      modelName: "openai/gpt-5.2",
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY!,
      },
    });

    await this.stagehand.init();
  }

  async disconnect(): Promise<void> {
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
    }
  }

  async goto(url: string): Promise<void> {
    await this.ensureConnected();
    await this.stagehand!.page.goto(url);
    await this.stagehand!.page.waitForLoadState("networkidle");
  }

  async act(instruction: string): Promise<void> {
    await this.ensureConnected();
    await this.stagehand!.act(instruction);
  }

  async extract<T>(instruction: string, schema: ZodSchema<T>): Promise<T> {
    await this.ensureConnected();
    return this.stagehand!.extract({ instruction, schema });
  }

  async screenshot(path: string): Promise<void> {
    await this.ensureConnected();
    await this.stagehand!.page.screenshot({ path, fullPage: true });
  }

  private async ensureConnected(): Promise<void> {
    if (!this.stagehand) {
      await this.connect();
    }
  }
}

// Usage
const browser = new BrowserAutomation();
await browser.goto("https://example.com");
await browser.act("click the login button");
const data = await browser.extract("get the page title", z.object({ title: z.string() }));
await browser.screenshot("result.png");
await browser.disconnect();
```

## Part 7: Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Cold start timeout | Cloud Run scaling from zero | Increase client timeout to 60s |
| Connection refused | Steel not running | Check `curl $STEEL_URL/health` |
| CDP connection failed | Wrong URL format | Use `wss://` not `https://` for CDP |
| Out of memory | Chrome needs ~1.5GB | Ensure Cloud Run has 2Gi memory |
| Act/Extract fails | Page not loaded | Add `waitForLoadState("networkidle")` |

### Debug Mode

Enable verbose logging:

```typescript
const stagehand = new Stagehand({
  // ... other options
  verbose: 2, // 0=silent, 1=info, 2=debug
  debugDom: true, // Log DOM snapshots
});
```

### Health Check Script

```bash
#!/bin/bash
# scripts/check-steel.sh

STEEL_URL="${STEEL_URL:-https://steel-browser-xxx.run.app}"

echo "Checking Steel Browser at $STEEL_URL..."

# Health check
if curl -sf "$STEEL_URL/health" > /dev/null; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi

# Test session creation
SESSION=$(curl -sf -X POST "$STEEL_URL/v1/sessions" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ -n "$SESSION" ]; then
  echo "✅ Session creation works"
  SESSION_ID=$(echo "$SESSION" | jq -r '.id')

  # Cleanup
  curl -sf -X DELETE "$STEEL_URL/v1/sessions/$SESSION_ID" > /dev/null
  echo "✅ Session cleanup works"
else
  echo "❌ Session creation failed"
  exit 1
fi

echo ""
echo "Steel Browser is ready!"
echo "CDP URL: ${STEEL_URL/https:/wss:}/cdp"
```

## Part 8: Cost Optimization

### Cloud Run Free Tier Limits

| Resource | Free Tier | Notes |
|----------|-----------|-------|
| Requests | 2 million/month | Per project |
| CPU | 360,000 vCPU-seconds | ~100 hours |
| Memory | 180,000 GB-seconds | ~25 hours at 2GB |
| Networking | 1 GB egress | North America |

### Tips to Stay Free

1. **Use scales-to-zero** - Default behavior, no changes needed
2. **Set memory to 2Gi** - Minimum for Chrome, don't over-provision
3. **Use 1 vCPU** - Sufficient for most automation
4. **Batch operations** - Reuse sessions instead of creating new ones
5. **Set reasonable timeouts** - Close sessions when done

### Monitoring Usage

```bash
# View Cloud Run metrics
gcloud run services describe steel-browser \
  --region us-central1 \
  --format 'yaml(status.traffic,status.latestCreatedRevisionName)'

# View billing
open "https://console.cloud.google.com/billing"
```

## Quick Reference

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STEEL_URL` | Yes | Steel Browser Cloud Run URL |
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT models |
| `GCP_PROJECT_ID` | Deploy only | GCP project ID |
| `GCP_SA_KEY` | Deploy only | Service account JSON key |

### Stagehand Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `act()` | Perform action | `act("click submit")` |
| `extract()` | Get structured data | `extract({ instruction, schema })` |
| `observe()` | Discover actions | `observe({ instruction })` |
| `page.goto()` | Navigate | `page.goto("https://...")` |
| `page.screenshot()` | Capture screen | `page.screenshot({ path })` |

### Steel API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/v1/sessions` | POST | Create session |
| `/v1/sessions/:id` | DELETE | Release session |
| `/v1/scrape` | POST | Scrape page HTML |
| `/v1/screenshot` | POST | Take screenshot |
| `/cdp` | WebSocket | CDP connection |

## Resources

- [Stagehand Documentation](https://docs.stagehand.dev/)
- [Stagehand GitHub](https://github.com/browserbase/stagehand)
- [Steel Documentation](https://docs.steel.dev/)
- [Steel GitHub](https://github.com/steel-dev/steel-browser)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [OpenAI API](https://platform.openai.com/docs)
