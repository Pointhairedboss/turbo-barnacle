#!/usr/bin/env node
// Inline build script - generates single-file index.html from dist/

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Fetch external resource via HTTPS
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirects
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Read the built HTML from dist/
const htmlPath = resolve(projectRoot, 'dist/index.html');
let html = readFileSync(htmlPath, 'utf-8');

// Extract all script and link tags from Vite build output
// SECURITY NOTE: These regexes process trusted build output from Vite, not untrusted user input.
// The build output format is controlled and predictable. For security-critical HTML parsing
// (e.g., user input sanitization), use a proper HTML parser like DOMParser or jsdom.
// 
// The regex allows optional whitespace before closing > to handle various formatting styles,
// though Vite's output is consistent. This is a build-time tool, not a runtime sanitizer.
const scriptRegex = /<script[^>]*\ssrc="([^"]+)"[^>]*><\/script\s*>/gi;
const linkRegex = /<link[^>]*\srel="stylesheet"[^>]*\shref="([^"]+)"[^>]*>/gi;

// Inline external scripts (both local and CDN)
let match;
scriptRegex.lastIndex = 0;
const scriptMatches = [];
while ((match = scriptRegex.exec(html)) !== null) {
  scriptMatches.push({ full: match[0], src: match[1] });
}

for (const { full, src } of scriptMatches) {
  try {
    let scriptContent;
    if (src.startsWith('http://') || src.startsWith('https://')) {
      // Fetch from CDN
      console.log(`Fetching external script: ${src}`);
      scriptContent = await fetchUrl(src);
    } else {
      // Read from local dist
      const scriptPath = resolve(projectRoot, 'dist', src.replace(/^\//, ''));
      scriptContent = readFileSync(scriptPath, 'utf-8');
    }
    
    // Preserve type="module" if present
    const isModule = full.includes('type="module"');
    const scriptTag = isModule ? 
      `<script type="module">${scriptContent}</script>` :
      `<script>${scriptContent}</script>`;
    
    html = html.replace(full, scriptTag);
  } catch(e) {
    console.warn(`Warning: Could not inline ${src}:`, e.message);
  }
}

// Inline external CSS (both local and CDN)
linkRegex.lastIndex = 0;
const cssMatches = [];
while ((match = linkRegex.exec(html)) !== null) {
  cssMatches.push({ full: match[0], href: match[1] });
}

for (const { full, href } of cssMatches) {
  try {
    let cssContent;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      // Fetch from CDN
      console.log(`Fetching external CSS: ${href}`);
      cssContent = await fetchUrl(href);
    } else {
      // Read from local dist
      const cssPath = resolve(projectRoot, 'dist', href.replace(/^\//, ''));
      cssContent = readFileSync(cssPath, 'utf-8');
    }
    
    html = html.replace(full, `<style>${cssContent}</style>`);
  } catch(e) {
    console.warn(`Warning: Could not inline ${href}:`, e.message);
  }
}

// Create dist-inline directory and write the inlined HTML
mkdirSync(resolve(projectRoot, 'dist-inline'), { recursive: true });
const outputPath = resolve(projectRoot, 'dist-inline/index.html');
writeFileSync(outputPath, html, 'utf-8');

console.log(`✓ Inlined build created at: ${outputPath}`);
console.log(`  Size: ${(html.length / 1024).toFixed(2)} KiB`);
