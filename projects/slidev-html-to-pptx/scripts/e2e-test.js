// ABOUTME: End-to-end test for the Slidev HTML to PPTX pipeline
// ABOUTME: Runs the full pipeline and generates a comparison report

import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

async function runCommand(cmd, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Step: ${description}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Running: ${cmd}\n`);

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: projectRoot,
      timeout: 120000
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`✓ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`✗ ${description} failed:`);
    console.error(error.message);
    return false;
  }
}

async function getFileSize(filePath) {
  try {
    const stats = await stat(filePath);
    return `${(stats.size / 1024).toFixed(2)} KB`;
  } catch {
    return 'N/A';
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('Generating Comparison Report');
  console.log('='.repeat(60));

  const outputDir = join(projectRoot, 'output');
  const comparisonDir = join(projectRoot, 'comparison');

  // Check output files
  const inputPptx = join(outputDir, 'input-presentation.pptx');
  const outputPptx = join(outputDir, 'output-presentation.pptx');

  const inputExists = existsSync(inputPptx);
  const outputExists = existsSync(outputPptx);

  // Check comparison images
  let comparisonFiles = [];
  if (existsSync(comparisonDir)) {
    comparisonFiles = await readdir(comparisonDir);
  }

  const inputImages = comparisonFiles.filter(f => f.startsWith('input-') && f.endsWith('.png'));
  const htmlImages = comparisonFiles.filter(f => f.startsWith('html-') && f.endsWith('.png'));
  const outputImages = comparisonFiles.filter(f => f.startsWith('output-') && f.endsWith('.png'));

  // Generate HTML report
  const report = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slidev HTML to PPTX - Comparison Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    h1 { text-align: center; color: #1a1a2e; }
    h2 { color: #333; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .summary-item {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }
    .summary-item h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
    .summary-item .value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .summary-item.success .value { color: #2ecc71; }
    .summary-item.warning .value { color: #f39c12; }
    .summary-item.error .value { color: #e74c3c; }

    .comparison {
      margin-bottom: 40px;
    }
    .slide-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .slide-col {
      text-align: center;
    }
    .slide-col h4 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
    }
    .slide-col img {
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .slide-col .no-image {
      background: #f0f0f0;
      padding: 40px;
      border-radius: 4px;
      color: #999;
    }

    .pipeline {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .pipeline-flow {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .pipeline-step {
      background: #3498db;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: bold;
    }
    .pipeline-arrow {
      font-size: 24px;
      color: #999;
    }

    .notes {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .notes h3 { margin-top: 0; color: #856404; }
    .notes ul { margin: 0; padding-left: 20px; }
  </style>
</head>
<body>
  <h1>🎨 Slidev HTML to PPTX - Visual Comparison</h1>

  <div class="pipeline">
    <h2>Pipeline Flow</h2>
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

  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item ${inputExists ? 'success' : 'error'}">
        <h3>Input PPTX</h3>
        <div class="value">${inputExists ? '✓ Created' : '✗ Missing'}</div>
        <div>${inputExists ? await getFileSize(inputPptx) : ''}</div>
      </div>
      <div class="summary-item ${htmlImages.length > 0 ? 'success' : 'error'}">
        <h3>HTML Screenshots</h3>
        <div class="value">${htmlImages.length} slides</div>
      </div>
      <div class="summary-item ${outputExists ? 'success' : 'error'}">
        <h3>Output PPTX</h3>
        <div class="value">${outputExists ? '✓ Created' : '✗ Missing'}</div>
        <div>${outputExists ? await getFileSize(outputPptx) : ''}</div>
      </div>
    </div>
  </div>

  <div class="comparison">
    <h2>Slide-by-Slide Comparison</h2>
    ${[1, 2, 3, 4, 5].map(slideNum => {
      const inputImg = inputImages.find(f => f.includes(`slide-${slideNum}`));
      const htmlImg = htmlImages.find(f => f.includes(`slide-${slideNum}`));
      const outputImg = outputImages.find(f => f.includes(`slide-${slideNum}`));

      return `
    <div class="slide-row">
      <div class="slide-col">
        <h4>Input PPTX - Slide ${slideNum}</h4>
        ${inputImg ? `<img src="./${inputImg}" alt="Input Slide ${slideNum}">` : '<div class="no-image">No image available</div>'}
      </div>
      <div class="slide-col">
        <h4>HTML - Slide ${slideNum}</h4>
        ${htmlImg ? `<img src="./${htmlImg}" alt="HTML Slide ${slideNum}">` : '<div class="no-image">No image available</div>'}
      </div>
      <div class="slide-col">
        <h4>Output PPTX - Slide ${slideNum}</h4>
        ${outputImg ? `<img src="./${outputImg}" alt="Output Slide ${slideNum}">` : '<div class="no-image">No image available</div>'}
      </div>
    </div>`;
    }).join('\n')}
  </div>

  <div class="notes">
    <h3>📝 Notes</h3>
    <ul>
      <li><strong>Input PPTX:</strong> Created using PptxGenJS with programmatic content</li>
      <li><strong>HTML:</strong> Rendered using Slidev-style CSS with matching content</li>
      <li><strong>Output PPTX:</strong> Generated by dom-to-pptx from the HTML representation</li>
      <li>Compare visual fidelity between all three representations</li>
      <li>The output PPTX should closely match the HTML styling</li>
    </ul>
  </div>

  <p style="text-align: center; color: #999; margin-top: 40px;">
    Generated: ${new Date().toISOString()}<br>
    Pipeline: Input PPTX → Slidev Theme → HTML → dom-to-pptx → Output PPTX
  </p>
</body>
</html>`;

  const reportPath = join(comparisonDir, 'comparison-report.html');
  await writeFile(reportPath, report);
  console.log(`\nReport generated: ${reportPath}`);

  return {
    inputExists,
    outputExists,
    inputImages: inputImages.length,
    htmlImages: htmlImages.length,
    outputImages: outputImages.length
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Slidev HTML to PPTX - End-to-End Test Pipeline         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const steps = [
    { cmd: 'node scripts/create-input-pptx.js', desc: 'Create Input PPTX' },
    { cmd: 'node scripts/convert-html-to-pptx.js', desc: 'Convert HTML to Output PPTX' },
    { cmd: 'node scripts/capture-screenshots.js', desc: 'Capture Screenshots for Comparison' }
  ];

  let allPassed = true;

  for (const step of steps) {
    const success = await runCommand(step.cmd, step.desc);
    if (!success) {
      allPassed = false;
      console.log('\nPipeline halted due to failure.');
      break;
    }
  }

  // Generate comparison report
  const report = await generateReport();

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('═'.repeat(60));

  if (allPassed) {
    console.log('✓ All pipeline steps completed successfully!');
  } else {
    console.log('✗ Some pipeline steps failed.');
  }

  console.log(`\nFiles created:`);
  console.log(`  - Input PPTX: ${report.inputExists ? '✓' : '✗'}`);
  console.log(`  - Output PPTX: ${report.outputExists ? '✓' : '✗'}`);
  console.log(`  - Input screenshots: ${report.inputImages}`);
  console.log(`  - HTML screenshots: ${report.htmlImages}`);
  console.log(`  - Output screenshots: ${report.outputImages}`);

  console.log(`\nComparison report: comparison/comparison-report.html`);
  console.log('\nOpen the HTML report to visually compare all three formats!');
}

main().catch(console.error);
