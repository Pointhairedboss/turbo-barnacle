#!/usr/bin/env node
// Inline build script - generates single-file index.html from dist/

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Read the built HTML from dist/
const htmlPath = resolve(projectRoot, 'dist/index.html');
let html = readFileSync(htmlPath, 'utf-8');

// Extract all script and link tags
const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g;
const linkRegex = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;

// Replace external JS files with inline scripts
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  const scriptSrc = match[1];
  const scriptPath = resolve(projectRoot, 'dist', scriptSrc.replace(/^\//, ''));
  try {
    const scriptContent = readFileSync(scriptPath, 'utf-8');
    html = html.replace(match[0], `<script type="module">${scriptContent}</script>`);
  } catch(e) {
    console.warn(`Warning: Could not inline ${scriptSrc}:`, e.message);
  }
}

// Replace external CSS files with inline styles
html = html.replace(linkRegex, (match, href) => {
  const cssPath = resolve(projectRoot, 'dist', href.replace(/^\//, ''));
  try {
    const cssContent = readFileSync(cssPath, 'utf-8');
    return `<style>${cssContent}</style>`;
  } catch(e) {
    console.warn(`Warning: Could not inline ${href}:`, e.message);
    return match;
  }
});

// Create dist-inline directory and write the inlined HTML
mkdirSync(resolve(projectRoot, 'dist-inline'), { recursive: true });
const outputPath = resolve(projectRoot, 'dist-inline/index.html');
writeFileSync(outputPath, html, 'utf-8');

console.log(`✓ Inlined build created at: ${outputPath}`);
console.log(`  Size: ${(html.length / 1024).toFixed(2)} KiB`);
