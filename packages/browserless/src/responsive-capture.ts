/**
 * Responsive Screenshot Capture Utility
 *
 * Provides high-level functions for capturing screenshots across multiple
 * viewport sizes. Designed to be project-agnostic - each project provides
 * its own URL and configuration.
 *
 * @example
 * ```typescript
 * import { captureResponsiveScreenshots, VIEWPORT_PRESETS } from '@research/browserless';
 *
 * // Capture all default viewports
 * const results = await captureResponsiveScreenshots('https://myapp.com', {
 *   outputDir: './screenshots',
 * });
 *
 * // Capture specific viewports
 * const results = await captureResponsiveScreenshots('https://myapp.com', {
 *   outputDir: './screenshots',
 *   viewports: [VIEWPORT_PRESETS.iphoneSe, VIEWPORT_PRESETS.desktop1080p],
 * });
 * ```
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { executeFlow } from "./browserless-client.js";

/**
 * Viewport configuration for a device
 */
export interface ViewportConfig {
  /** Identifier for the viewport (used in filenames) */
  name: string;
  /** Viewport width in pixels */
  width: number;
  /** Viewport height in pixels */
  height: number;
  /** Device pixel ratio (default: 1) */
  deviceScaleFactor?: number;
}

/**
 * Common device viewport presets
 */
export const VIEWPORT_PRESETS = {
  // Mobile devices
  iphoneSe: { name: "iphone-se", width: 375, height: 667, deviceScaleFactor: 2 },
  iphone14: { name: "iphone-14", width: 390, height: 844, deviceScaleFactor: 3 },
  iphone14ProMax: { name: "iphone-14-pro-max", width: 430, height: 932, deviceScaleFactor: 3 },
  pixel7: { name: "pixel-7", width: 412, height: 915, deviceScaleFactor: 2.625 },
  galaxyS21: { name: "galaxy-s21", width: 360, height: 800, deviceScaleFactor: 3 },
  // Tablets
  ipadMini: { name: "ipad-mini", width: 768, height: 1024, deviceScaleFactor: 2 },
  ipadPro11: { name: "ipad-pro-11", width: 834, height: 1194, deviceScaleFactor: 2 },
  // Desktop
  desktop1080p: { name: "desktop-1080p", width: 1920, height: 1080, deviceScaleFactor: 1 },
  desktop1440p: { name: "desktop-1440p", width: 2560, height: 1440, deviceScaleFactor: 1 },
} as const satisfies Record<string, ViewportConfig>;

/**
 * Default viewports used when none specified
 */
export const DEFAULT_VIEWPORTS: ViewportConfig[] = [
  VIEWPORT_PRESETS.iphoneSe,
  VIEWPORT_PRESETS.iphone14,
  VIEWPORT_PRESETS.iphone14ProMax,
  VIEWPORT_PRESETS.pixel7,
  VIEWPORT_PRESETS.galaxyS21,
  VIEWPORT_PRESETS.ipadMini,
  VIEWPORT_PRESETS.ipadPro11,
  VIEWPORT_PRESETS.desktop1080p,
];

/**
 * Screenshot capture options
 */
export interface CaptureOptions {
  /** Image format (default: 'jpeg') */
  format?: "jpeg" | "png" | "webp";
  /** Quality 0-100 for jpeg/webp (default: 90) */
  quality?: number;
  /** Capture full page instead of viewport (default: false) */
  fullPage?: boolean;
  /** Timeout in ms for page load (default: 30000) */
  timeout?: number;
}

/**
 * Options for capturing a single screenshot
 */
export interface SingleCaptureOptions extends CaptureOptions {
  /** Viewport configuration */
  viewport: ViewportConfig;
  /** Output file path (optional, returns base64 if not provided) */
  outputPath?: string;
}

/**
 * Result from a single screenshot capture
 */
export interface CaptureResult {
  /** Viewport used */
  viewport: ViewportConfig;
  /** File path if saved to disk */
  filePath?: string;
  /** Base64 image data */
  base64: string;
  /** HTTP status from navigation */
  status: number;
}

/**
 * Options for responsive screenshot capture
 */
export interface ResponsiveCaptureOptions extends CaptureOptions {
  /** Output directory for screenshots */
  outputDir: string;
  /** Viewports to capture (default: DEFAULT_VIEWPORTS) */
  viewports?: ViewportConfig[];
  /** Also capture full page screenshots for mobile viewports */
  includeFullPage?: boolean;
  /** Filename prefix (default: none) */
  filenamePrefix?: string;
  /** Called for each viewport capture */
  onCapture?: (viewport: ViewportConfig, index: number, total: number) => void;
}

/**
 * Result from responsive capture
 */
export interface ResponsiveCaptureResult {
  /** Successfully captured screenshots */
  screenshots: CaptureResult[];
  /** Errors encountered */
  errors: Array<{ viewport: ViewportConfig; error: string }>;
  /** Output directory */
  outputDir: string;
}

interface ScreenshotFlowResult {
  viewport: { width: number; height: number };
  goto: { status: number; url: string };
  screenshot: { base64: string };
}

/**
 * Capture a screenshot at a specific viewport
 *
 * @param url - Target URL to capture
 * @param options - Capture options including viewport
 * @returns Capture result with base64 data and optional file path
 */
export async function captureAtViewport(
  url: string,
  options: SingleCaptureOptions
): Promise<CaptureResult> {
  const {
    viewport,
    format = "jpeg",
    quality = 90,
    fullPage = false,
    timeout = 30000,
    outputPath,
  } = options;

  const query = `
    mutation CaptureViewport {
      viewport(
        width: ${viewport.width}
        height: ${viewport.height}
        deviceScaleFactor: ${viewport.deviceScaleFactor ?? 1}
      ) {
        width
        height
      }
      goto(url: "${url}", waitUntil: networkIdle, timeout: ${timeout}) {
        status
        url
      }
      screenshot(type: ${format}, quality: ${quality}, fullPage: ${fullPage}, optimizeForSpeed: true) {
        base64
      }
    }
  `;

  const result = await executeFlow<ScreenshotFlowResult>(query);

  const captureResult: CaptureResult = {
    viewport,
    base64: result.screenshot.base64,
    status: result.goto.status,
  };

  if (outputPath) {
    mkdirSync(resolve(outputPath, ".."), { recursive: true });
    writeFileSync(outputPath, Buffer.from(result.screenshot.base64, "base64"));
    captureResult.filePath = outputPath;
  }

  return captureResult;
}

/**
 * Capture screenshots across multiple viewports
 *
 * @param url - Target URL to capture (required, no defaults)
 * @param options - Capture options including output directory
 * @returns Results with screenshots and any errors
 *
 * @example
 * ```typescript
 * const results = await captureResponsiveScreenshots('https://myapp.com', {
 *   outputDir: './screenshots',
 *   viewports: [VIEWPORT_PRESETS.iphone14, VIEWPORT_PRESETS.desktop1080p],
 *   includeFullPage: true,
 * });
 *
 * console.log(`Captured ${results.screenshots.length} screenshots`);
 * ```
 */
export async function captureResponsiveScreenshots(
  url: string,
  options: ResponsiveCaptureOptions
): Promise<ResponsiveCaptureResult> {
  const {
    outputDir,
    viewports = DEFAULT_VIEWPORTS,
    format = "jpeg",
    quality = 90,
    fullPage = false,
    timeout = 30000,
    includeFullPage = false,
    filenamePrefix = "",
    onCapture,
  } = options;

  mkdirSync(outputDir, { recursive: true });

  const ext = format === "jpeg" ? "jpg" : format;
  const prefix = filenamePrefix ? `${filenamePrefix}-` : "";
  const screenshots: CaptureResult[] = [];
  const errors: Array<{ viewport: ViewportConfig; error: string }> = [];

  // Capture viewport screenshots
  for (let i = 0; i < viewports.length; i++) {
    const viewport = viewports[i];
    if (!viewport) continue;

    onCapture?.(viewport, i, viewports.length);

    try {
      const outputPath = resolve(outputDir, `${prefix}${viewport.name}.${ext}`);
      const result = await captureAtViewport(url, {
        viewport,
        format,
        quality,
        fullPage,
        timeout,
        outputPath,
      });
      screenshots.push(result);
    } catch (error) {
      errors.push({
        viewport,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Capture full page screenshots for mobile viewports if requested
  if (includeFullPage) {
    const mobileViewports = viewports.filter((v) => v.width < 768);
    for (const viewport of mobileViewports) {
      onCapture?.(viewport, viewports.length, viewports.length);

      try {
        const outputPath = resolve(outputDir, `${prefix}${viewport.name}-full.${ext}`);
        const result = await captureAtViewport(url, {
          viewport,
          format,
          quality,
          fullPage: true,
          timeout,
          outputPath,
        });
        screenshots.push(result);
      } catch (error) {
        errors.push({
          viewport,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { screenshots, errors, outputDir };
}
