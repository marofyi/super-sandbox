---
theme: default
title: Sample Presentation
info: |
  ## A Slidev to PPTX Conversion Test
  Created for testing the dom-to-pptx pipeline
class: text-center
highlighter: shiki
drawings:
  persist: false
transition: none
css: unocss
---

# Welcome to the Demo

A Slidev to PPTX Conversion Test

<div class="pt-12">
  <span class="text-gray-400">
    Created: January 2026
  </span>
</div>

<style>
.slidev-layout {
  background: #1a1a2e;
}
h1 {
  color: white;
  font-size: 2.75rem;
}
p {
  color: #cccccc;
  font-size: 1.5rem;
}
</style>

---

# Key Features

<div class="text-left text-xl space-y-4 mt-8">

- Convert any HTML element to PPTX
- Preserve gradients and shadows
- Maintain responsive layouts
- Support for complex CSS styles
- Fully editable output

</div>

<style>
.slidev-layout {
  background: white;
}
h1 {
  color: #333333;
  font-size: 2.25rem;
  font-weight: bold;
}
li {
  color: #444444;
}
</style>

---
layout: two-cols
---

# Two Column Layout

::left::

<div class="bg-blue-500 border-2 border-blue-600 rounded p-4 h-64 mr-4">
  <h3 class="text-white font-bold text-xl mb-4">Left Column</h3>
  <p class="text-white text-base">
    This is some content in the left column. It demonstrates text placement within a colored container.
  </p>
</div>

::right::

<div class="bg-green-500 border-2 border-green-600 rounded p-4 h-64 ml-4">
  <h3 class="text-white font-bold text-xl mb-4">Right Column</h3>
  <p class="text-white text-base">
    This is some content in the right column. It shows how the layout adapts to multiple content areas.
  </p>
</div>

<style>
.slidev-layout {
  background: #f5f5f5;
}
h1 {
  color: #333333;
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
}
</style>

---

# Code Example

```javascript
import { exportToPptx } from 'dom-to-pptx';

// Select the slide element
const slides = document.querySelectorAll('.slide');

// Export to PPTX
await exportToPptx(Array.from(slides), {
  fileName: 'presentation.pptx'
});
```

<style>
.slidev-layout {
  background: #1e1e1e;
}
h1 {
  color: white;
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
}
</style>

---
class: text-center
---

# Thank You!

Questions & Discussion

<style>
.slidev-layout {
  background: #1a1a2e;
}
h1 {
  color: white;
  font-size: 3rem;
  font-weight: bold;
  margin-top: 3rem;
}
p {
  color: #cccccc;
  font-size: 1.5rem;
  margin-top: 2rem;
}
</style>
