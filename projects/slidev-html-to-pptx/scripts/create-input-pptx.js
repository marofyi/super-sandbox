// ABOUTME: Creates a sample PPTX presentation using PptxGenJS
// ABOUTME: This serves as the input for the Slidev -> HTML -> PPTX pipeline

import pptxgen from 'pptxgenjs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function createInputPresentation() {
  console.log('Creating input PPTX presentation...');

  const pres = new pptxgen();

  // Set presentation properties
  pres.layout = 'LAYOUT_16x9';
  pres.title = 'Sample Presentation';
  pres.author = 'Slidev PPTX Test';

  // ========== SLIDE 1: Title Slide ==========
  const slide1 = pres.addSlide();
  slide1.background = { color: '1a1a2e' };

  slide1.addText('Welcome to the Demo', {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.2,
    fontSize: 44,
    bold: true,
    color: 'ffffff',
    fontFace: 'Arial',
    align: 'center'
  });

  slide1.addText('A Slidev to PPTX Conversion Test', {
    x: 0.5,
    y: 3.2,
    w: 9,
    h: 0.6,
    fontSize: 24,
    color: 'cccccc',
    fontFace: 'Arial',
    align: 'center'
  });

  slide1.addText('Created: January 2026', {
    x: 0.5,
    y: 4.5,
    w: 9,
    h: 0.4,
    fontSize: 16,
    color: '888888',
    fontFace: 'Arial',
    align: 'center'
  });

  // ========== SLIDE 2: Bullet Points ==========
  const slide2 = pres.addSlide();
  slide2.background = { color: 'ffffff' };

  slide2.addText('Key Features', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 36,
    bold: true,
    color: '333333',
    fontFace: 'Arial'
  });

  const bulletPoints = [
    'Convert any HTML element to PPTX',
    'Preserve gradients and shadows',
    'Maintain responsive layouts',
    'Support for complex CSS styles',
    'Fully editable output'
  ];

  bulletPoints.forEach((point, index) => {
    slide2.addText(`• ${point}`, {
      x: 0.8,
      y: 1.5 + (index * 0.7),
      w: 8.5,
      h: 0.6,
      fontSize: 22,
      color: '444444',
      fontFace: 'Arial'
    });
  });

  // ========== SLIDE 3: Two Column Layout ==========
  const slide3 = pres.addSlide();
  slide3.background = { color: 'f5f5f5' };

  slide3.addText('Two Column Layout', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.7,
    fontSize: 32,
    bold: true,
    color: '333333',
    fontFace: 'Arial',
    align: 'center'
  });

  // Left column - Blue box
  slide3.addShape(pres.ShapeType.rect, {
    x: 0.5,
    y: 1.2,
    w: 4.2,
    h: 3.5,
    fill: { color: '3498db' },
    line: { color: '2980b9', width: 2 }
  });

  slide3.addText('Left Column', {
    x: 0.5,
    y: 1.4,
    w: 4.2,
    h: 0.5,
    fontSize: 20,
    bold: true,
    color: 'ffffff',
    fontFace: 'Arial',
    align: 'center'
  });

  slide3.addText('This is some content in the left column. It demonstrates text placement within a colored container.', {
    x: 0.7,
    y: 2.0,
    w: 3.8,
    h: 2.5,
    fontSize: 16,
    color: 'ffffff',
    fontFace: 'Arial',
    valign: 'top'
  });

  // Right column - Green box
  slide3.addShape(pres.ShapeType.rect, {
    x: 5.3,
    y: 1.2,
    w: 4.2,
    h: 3.5,
    fill: { color: '2ecc71' },
    line: { color: '27ae60', width: 2 }
  });

  slide3.addText('Right Column', {
    x: 5.3,
    y: 1.4,
    w: 4.2,
    h: 0.5,
    fontSize: 20,
    bold: true,
    color: 'ffffff',
    fontFace: 'Arial',
    align: 'center'
  });

  slide3.addText('This is some content in the right column. It shows how the layout adapts to multiple content areas.', {
    x: 5.5,
    y: 2.0,
    w: 3.8,
    h: 2.5,
    fontSize: 16,
    color: 'ffffff',
    fontFace: 'Arial',
    valign: 'top'
  });

  // ========== SLIDE 4: Code Example ==========
  const slide4 = pres.addSlide();
  slide4.background = { color: '1e1e1e' };

  slide4.addText('Code Example', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.7,
    fontSize: 32,
    bold: true,
    color: 'ffffff',
    fontFace: 'Arial',
    align: 'center'
  });

  // Code block background
  slide4.addShape(pres.ShapeType.rect, {
    x: 0.5,
    y: 1.2,
    w: 9,
    h: 3.5,
    fill: { color: '2d2d2d' },
    line: { color: '444444', width: 1 }
  });

  const codeText = `import { exportToPptx } from 'dom-to-pptx';

// Select the slide element
const slides = document.querySelectorAll('.slide');

// Export to PPTX
await exportToPptx(Array.from(slides), {
  fileName: 'presentation.pptx'
});`;

  slide4.addText(codeText, {
    x: 0.7,
    y: 1.4,
    w: 8.6,
    h: 3.1,
    fontSize: 14,
    color: 'd4d4d4',
    fontFace: 'Consolas',
    valign: 'top'
  });

  // ========== SLIDE 5: Thank You ==========
  const slide5 = pres.addSlide();
  slide5.background = { color: '1a1a2e' };

  slide5.addText('Thank You!', {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.2,
    fontSize: 48,
    bold: true,
    color: 'ffffff',
    fontFace: 'Arial',
    align: 'center'
  });

  slide5.addText('Questions & Discussion', {
    x: 0.5,
    y: 3.5,
    w: 9,
    h: 0.6,
    fontSize: 24,
    color: 'cccccc',
    fontFace: 'Arial',
    align: 'center'
  });

  // Save the presentation
  const outputPath = new URL('../output/input-presentation.pptx', import.meta.url).pathname;
  await pres.writeFile({ fileName: outputPath });

  console.log(`Created input PPTX at: ${outputPath}`);
  console.log('Slides created: 5');
  console.log('  1. Title Slide');
  console.log('  2. Key Features (Bullets)');
  console.log('  3. Two Column Layout');
  console.log('  4. Code Example');
  console.log('  5. Thank You');
}

createInputPresentation().catch(console.error);
