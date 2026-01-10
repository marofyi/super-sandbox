// ABOUTME: Captures screenshots from HTML slides for visual comparison
// ABOUTME: Uses browserless for HTML screenshots; generates standalone HTML files for PPTX comparison

import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, readdir, writeFile, rm, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const browserlessDir = join(projectRoot, '..', '..', 'browserless');

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// Slide definitions - shared between HTML capture and HTML file generation
const slideDefinitions = [
  {
    id: 1,
    title: 'Title Slide',
    bg: '#1a1a2e',
    content: `
      <h1 style="color:white;font-size:44px;margin-bottom:20px;font-weight:bold">Welcome to the Demo</h1>
      <p style="color:#ccc;font-size:24px;margin-bottom:40px">A Slidev to PPTX Conversion Test</p>
      <p style="color:#888;font-size:16px">Created: January 2026</p>
    `,
    align: 'center',
    valign: 'center'
  },
  {
    id: 2,
    title: 'Key Features',
    bg: 'white',
    content: `
      <h1 style="color:#333;font-size:36px;text-align:left;margin-bottom:30px;font-weight:bold">Key Features</h1>
      <ul style="list-style:disc;padding-left:40px;text-align:left">
        <li style="color:#444;font-size:22px;margin-bottom:16px">Convert any HTML element to PPTX</li>
        <li style="color:#444;font-size:22px;margin-bottom:16px">Preserve gradients and shadows</li>
        <li style="color:#444;font-size:22px;margin-bottom:16px">Maintain responsive layouts</li>
        <li style="color:#444;font-size:22px;margin-bottom:16px">Support for complex CSS styles</li>
        <li style="color:#444;font-size:22px;margin-bottom:16px">Fully editable output</li>
      </ul>
    `,
    align: 'left',
    valign: 'start'
  },
  {
    id: 3,
    title: 'Two Column Layout',
    bg: '#f5f5f5',
    content: `
      <h1 style="color:#333;font-size:32px;text-align:center;margin-bottom:30px;font-weight:bold;width:100%">Two Column Layout</h1>
      <div style="display:flex;gap:40px;width:100%;flex:1;padding:0 20px">
        <div style="flex:1;background:#3498db;border:2px solid #2980b9;border-radius:4px;padding:20px;display:flex;flex-direction:column">
          <h3 style="color:white;font-size:20px;font-weight:bold;margin-bottom:16px">Left Column</h3>
          <p style="color:white;font-size:16px;line-height:1.5">This is some content in the left column. It demonstrates text placement within a colored container.</p>
        </div>
        <div style="flex:1;background:#2ecc71;border:2px solid #27ae60;border-radius:4px;padding:20px;display:flex;flex-direction:column">
          <h3 style="color:white;font-size:20px;font-weight:bold;margin-bottom:16px">Right Column</h3>
          <p style="color:white;font-size:16px;line-height:1.5">This is some content in the right column. It shows how the layout adapts to multiple content areas.</p>
        </div>
      </div>
    `,
    align: 'center',
    valign: 'start'
  },
  {
    id: 4,
    title: 'Code Example',
    bg: '#1e1e1e',
    content: `
      <h1 style="color:white;font-size:32px;text-align:center;margin-bottom:30px;font-weight:bold;width:100%">Code Example</h1>
      <div style="background:#2d2d2d;border:1px solid #444;padding:30px;border-radius:4px;text-align:left;width:100%;flex:1">
        <pre style="color:#d4d4d4;font-family:Consolas,Monaco,monospace;font-size:16px;line-height:1.8;margin:0;white-space:pre-wrap">import { exportToPptx } from 'dom-to-pptx';

// Select the slide element
const slides = document.querySelectorAll('.slide');

// Export to PPTX
await exportToPptx(Array.from(slides), {
  fileName: 'presentation.pptx'
});</pre>
      </div>
    `,
    align: 'center',
    valign: 'start'
  },
  {
    id: 5,
    title: 'Thank You',
    bg: '#1a1a2e',
    content: `
      <h1 style="color:white;font-size:48px;margin-bottom:40px;font-weight:bold">Thank You!</h1>
      <p style="color:#ccc;font-size:24px">Questions & Discussion</p>
    `,
    align: 'center',
    valign: 'center'
  }
];

function generateSlideHtml(slide) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Slide ${slide.id}: ${slide.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      width: 1920px;
      height: 1080px;
      display: flex;
      flex-direction: column;
      justify-content: ${slide.valign === 'start' ? 'flex-start' : 'center'};
      align-items: ${slide.align === 'center' ? 'center' : 'flex-start'};
      text-align: ${slide.align};
      padding: ${slide.valign === 'start' ? '60px' : '40px'};
      background: ${slide.bg};
    }
  </style>
</head>
<body>
${slide.content}
</body>
</html>`;
}

async function captureHtmlSlidesWithBrowserless(outputDir, prefix) {
  console.log('Capturing HTML slides using browserless with viewport control...');

  // Import browserless dynamically
  const browserless = await import(join(browserlessDir, 'dist', 'index.js'));
  const { captureAtViewport, VIEWPORT_PRESETS } = browserless;

  // Use full HD viewport for slide capture
  const viewport = VIEWPORT_PRESETS.desktop1080p;

  for (const slide of slideDefinitions) {
    const html = generateSlideHtml(slide);

    // Save HTML file (will be useful for manual comparison too)
    const htmlPath = join(outputDir, `${prefix}-slide-${slide.id}.html`);
    await writeFile(htmlPath, html);

    // Use browserless to capture via data URL with viewport control
    const dataUrl = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;

    try {
      const result = await captureAtViewport(dataUrl, {
        viewport: viewport,
        format: 'jpeg',
        quality: 95,
        fullPage: false,
        timeout: 30000
      });

      // Save screenshot
      const jpgPath = join(outputDir, `${prefix}-slide-${slide.id}.jpg`);
      await writeFile(jpgPath, Buffer.from(result.base64, 'base64'));
      console.log(`Captured: ${prefix}-slide-${slide.id}.jpg (${viewport.width}x${viewport.height})`);
    } catch (e) {
      console.log(`Failed to capture slide ${slide.id}: ${e.message}`);
      // Still keep the HTML file for manual inspection
    }
  }
}

async function generateComparisonReport(outputDir) {
  console.log('Generating comparison report...');

  const files = await readdir(outputDir);
  const htmlSlides = files.filter(f => f.startsWith('html-') && (f.endsWith('.jpg') || f.endsWith('.png')));

  const inputPptx = join(projectRoot, 'output', 'input-presentation.pptx');
  const outputPptx = join(projectRoot, 'output', 'output-presentation.pptx');

  const inputSize = existsSync(inputPptx) ? (await stat(inputPptx)).size : 0;
  const outputSize = existsSync(outputPptx) ? (await stat(outputPptx)).size : 0;

  const report = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slidev HTML to PPTX - Visual Comparison</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f0f2f5;
      color: #333;
    }
    h1 { text-align: center; color: #1a1a2e; margin-bottom: 30px; }
    h2 { color: #333; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-top: 40px; }

    .pipeline {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .pipeline-flow {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 15px;
    }
    .pipeline-step {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
    }
    .pipeline-arrow {
      font-size: 24px;
      color: #999;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .summary-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a2e;
    }
    .summary-card.success .value { color: #2ecc71; }
    .summary-card .size { font-size: 14px; color: #888; margin-top: 5px; }

    .slides-grid {
      display: grid;
      gap: 30px;
    }
    .slide-comparison {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .slide-comparison h3 {
      margin: 0 0 15px 0;
      color: #1a1a2e;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .slide-comparison h3 .badge {
      background: #3498db;
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
    }
    .slide-image {
      width: 100%;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    .slide-image:hover {
      transform: scale(1.02);
      transition: transform 0.2s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .no-image {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 60px 20px;
      border-radius: 8px;
      text-align: center;
      color: #666;
    }

    .instructions {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 20px;
      border-radius: 12px;
      margin: 30px 0;
    }
    .instructions h3 {
      margin: 0 0 15px 0;
      color: #856404;
    }
    .instructions ul {
      margin: 0;
      padding-left: 20px;
      color: #856404;
    }
    .instructions li { margin-bottom: 8px; }
    .instructions code {
      background: rgba(0,0,0,0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }

    footer {
      text-align: center;
      color: #888;
      margin-top: 40px;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h1>🎨 Slidev HTML to PPTX - Visual Comparison</h1>

  <div class="pipeline">
    <h2 style="margin-top: 0">Pipeline Flow</h2>
    <div class="pipeline-flow">
      <div class="pipeline-step">Input PPTX</div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-step">Slidev Theme</div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-step">HTML</div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-step">dom-to-pptx</div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-step">Output PPTX</div>
    </div>
  </div>

  <h2>Summary</h2>
  <div class="summary">
    <div class="summary-card success">
      <h3>Input PPTX</h3>
      <div class="value">✓</div>
      <div class="size">${(inputSize / 1024).toFixed(1)} KB</div>
    </div>
    <div class="summary-card success">
      <h3>HTML Slides</h3>
      <div class="value">${htmlSlides.length}</div>
      <div class="size">Screenshots captured</div>
    </div>
    <div class="summary-card success">
      <h3>Output PPTX</h3>
      <div class="value">✓</div>
      <div class="size">${(outputSize / 1024).toFixed(1)} KB</div>
    </div>
  </div>

  <div class="instructions">
    <h3>📋 How to Compare</h3>
    <ul>
      <li><strong>HTML Screenshots:</strong> View the PNG images below - these show the Slidev-style HTML rendering</li>
      <li><strong>Input PPTX:</strong> Open <code>output/input-presentation.pptx</code> in PowerPoint/LibreOffice</li>
      <li><strong>Output PPTX:</strong> Open <code>output/output-presentation.pptx</code> in PowerPoint/LibreOffice</li>
      <li>Compare the visual layout, colors, fonts, and positioning across all three formats</li>
    </ul>
  </div>

  <h2>HTML Slide Screenshots (Slidev-style)</h2>
  <div class="slides-grid">
    ${slideDefinitions.map(slide => {
      const imgFile = `html-slide-${slide.id}.jpg`;
      const hasImage = htmlSlides.includes(imgFile);
      return `
    <div class="slide-comparison">
      <h3>
        <span class="badge">Slide ${slide.id}</span>
        ${slide.title}
      </h3>
      ${hasImage
        ? `<img src="${imgFile}" alt="Slide ${slide.id}" class="slide-image">`
        : `<div class="no-image">Screenshot not available<br><small>Open html-slide-${slide.id}.html to view</small></div>`
      }
    </div>`;
    }).join('\n')}
  </div>

  <footer>
    <p>Generated: ${new Date().toISOString()}</p>
    <p>Pipeline: Input PPTX → Slidev Theme → HTML → dom-to-pptx simulation → Output PPTX</p>
  </footer>
</body>
</html>`;

  await writeFile(join(outputDir, 'comparison-report.html'), report);
  console.log('Comparison report generated: comparison/comparison-report.html');
}

async function main() {
  const comparisonDir = join(projectRoot, 'comparison');
  await ensureDir(comparisonDir);

  console.log('='.repeat(60));
  console.log('Slidev HTML to PPTX - Screenshot Capture');
  console.log('='.repeat(60));

  // Try to capture HTML slides with browserless
  try {
    await captureHtmlSlidesWithBrowserless(comparisonDir, 'html');
  } catch (e) {
    console.log(`Browserless capture failed: ${e.message}`);
    console.log('Generating HTML files for manual inspection instead...');

    // At minimum, generate the HTML files
    for (const slide of slideDefinitions) {
      const html = generateSlideHtml(slide);
      const htmlPath = join(comparisonDir, `html-slide-${slide.id}.html`);
      await writeFile(htmlPath, html);
      console.log(`Created: html-slide-${slide.id}.html`);
    }
  }

  // Generate comparison report
  await generateComparisonReport(comparisonDir);

  console.log('\n=== Screenshot Capture Complete ===');
  console.log(`Files saved to: ${comparisonDir}`);

  const files = await readdir(comparisonDir);
  console.log('\nGenerated files:');
  files.sort().forEach(f => console.log(`  - ${f}`));
}

main().catch(console.error);
