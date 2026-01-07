#!/usr/bin/env node
/**
 * Browserless Screenshot CLI
 *
 * Capture screenshots of web pages using Browserless BrowserQL.
 *
 * @example
 * ```bash
 * # Single screenshot at desktop resolution
 * ./browserless/scripts/screenshot.sh https://example.com
 *
 * # Responsive screenshots across all default viewports
 * ./browserless/scripts/screenshot.sh https://example.com --responsive
 *
 * # Custom output directory
 * ./browserless/scripts/screenshot.sh https://example.com --output ./screenshots
 *
 * # Specific viewport
 * ./browserless/scripts/screenshot.sh https://example.com --width 375 --height 667
 * ```
 */

import { resolve } from "path";
import {
  captureAtViewport,
  captureResponsiveScreenshots,
  VIEWPORT_PRESETS,
  DEFAULT_VIEWPORTS,
} from "../responsive-capture.js";
import { isConfigured } from "../browserless-client.js";

interface CliOptions {
  url: string;
  output: string;
  responsive: boolean;
  width: number;
  height: number;
  fullPage: boolean;
  format: "jpeg" | "png" | "webp";
  quality: number;
  viewport?: string;
  help: boolean;
}

function printHelp(): void {
  console.log(`
Browserless Screenshot CLI

Usage:
  screenshot <url> [options]

Arguments:
  url                    URL to capture (required)

Options:
  -o, --output <path>    Output file or directory (default: ./screenshot.jpg or ./screenshots/)
  -r, --responsive       Capture all default viewports (mobile, tablet, desktop)
  -w, --width <px>       Viewport width in pixels (default: 1920)
  -h, --height <px>      Viewport height in pixels (default: 1080)
  -v, --viewport <name>  Use a preset viewport: ${Object.keys(VIEWPORT_PRESETS).join(", ")}
  -f, --full-page        Capture full page instead of viewport
  --format <type>        Image format: jpeg, png, webp (default: jpeg)
  --quality <0-100>      Image quality for jpeg/webp (default: 90)
  --help                 Show this help message

Environment:
  BROWSERLESS_TOKEN      Required. Your Browserless API token.
  BROWSERLESS_URL        Optional. Custom Browserless endpoint.

Examples:
  # Desktop screenshot to default location
  screenshot https://example.com

  # Responsive screenshots to custom directory
  screenshot https://example.com --responsive --output ./my-screenshots

  # Mobile viewport with full page capture
  screenshot https://example.com --viewport iphone14 --full-page

  # Custom dimensions
  screenshot https://example.com --width 800 --height 600 --output ./custom.png --format png
`);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    url: "",
    output: "",
    responsive: false,
    width: 1920,
    height: 1080,
    fullPage: false,
    format: "jpeg",
    quality: 90,
    viewport: undefined,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--help":
        options.help = true;
        break;
      case "-o":
      case "--output":
        options.output = next || "";
        i++;
        break;
      case "-r":
      case "--responsive":
        options.responsive = true;
        break;
      case "-w":
      case "--width":
        options.width = parseInt(next || "1920", 10);
        i++;
        break;
      case "-h":
      case "--height":
        options.height = parseInt(next || "1080", 10);
        i++;
        break;
      case "-v":
      case "--viewport":
        options.viewport = next;
        i++;
        break;
      case "-f":
      case "--full-page":
        options.fullPage = true;
        break;
      case "--format":
        if (next === "jpeg" || next === "png" || next === "webp") {
          options.format = next;
        }
        i++;
        break;
      case "--quality":
        options.quality = parseInt(next || "90", 10);
        i++;
        break;
      default:
        // First non-flag argument is the URL
        if (!arg?.startsWith("-") && !options.url) {
          options.url = arg || "";
        }
    }
  }

  return options;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  if (!options.url) {
    console.error("Error: URL is required");
    console.error("Run with --help for usage information");
    process.exit(1);
  }

  if (!isConfigured()) {
    console.error("Error: BROWSERLESS_TOKEN environment variable is not set");
    console.error("Get your token at https://browserless.io");
    process.exit(1);
  }

  try {
    if (options.responsive) {
      // Responsive mode: capture all viewports
      const outputDir = options.output || "./screenshots";
      console.log(`Capturing responsive screenshots of ${options.url}`);
      console.log(`Output directory: ${resolve(outputDir)}`);
      console.log(`Viewports: ${DEFAULT_VIEWPORTS.length}`);
      console.log("");

      const results = await captureResponsiveScreenshots(options.url, {
        outputDir,
        format: options.format,
        quality: options.quality,
        fullPage: options.fullPage,
        onCapture: (viewport, index, total) => {
          console.log(`[${index + 1}/${total}] Capturing ${viewport.name} (${viewport.width}x${viewport.height})...`);
        },
      });

      console.log("");
      console.log(`Captured ${results.screenshots.length} screenshots`);

      if (results.errors.length > 0) {
        console.error(`Errors: ${results.errors.length}`);
        for (const err of results.errors) {
          console.error(`  - ${err.viewport.name}: ${err.error}`);
        }
        process.exit(1);
      }

      for (const screenshot of results.screenshots) {
        console.log(`  ${screenshot.filePath}`);
      }
    } else {
      // Single screenshot mode
      let viewport = { name: "custom", width: options.width, height: options.height };

      // Use preset viewport if specified
      if (options.viewport) {
        const preset = VIEWPORT_PRESETS[options.viewport as keyof typeof VIEWPORT_PRESETS];
        if (!preset) {
          console.error(`Error: Unknown viewport "${options.viewport}"`);
          console.error(`Available presets: ${Object.keys(VIEWPORT_PRESETS).join(", ")}`);
          process.exit(1);
        }
        viewport = preset;
      }

      const ext = options.format === "jpeg" ? "jpg" : options.format;
      const defaultOutput = `./screenshot-${viewport.name}.${ext}`;
      const outputPath = options.output || defaultOutput;

      console.log(`Capturing screenshot of ${options.url}`);
      console.log(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
      console.log(`Output: ${resolve(outputPath)}`);

      const result = await captureAtViewport(options.url, {
        viewport,
        format: options.format,
        quality: options.quality,
        fullPage: options.fullPage,
        outputPath,
      });

      console.log(`Saved: ${result.filePath} (HTTP ${result.status})`);
    }
  } catch (error) {
    console.error("Error capturing screenshot:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
