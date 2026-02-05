#!/usr/bin/env node
/**
 * Generate a custom jscpd HTML report with summary table and format cards.
 * Usage: node scripts/jscpd-html-report.mjs [json-input] [html-output]
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const inputPath = process.argv[2] || 'reports/jscpd/jscpd-report.json';
const outputPath = process.argv[3] || 'reports/jscpd/jscpd-report.html';

const data = JSON.parse(readFileSync(resolve(inputPath), 'utf-8'));

// Build file stats: count duplicates per file
const fileStats = {};
for (const dup of data.duplicates) {
  const format = dup.format;
  
  // First file
  const f1 = dup.firstFile.name;
  if (!fileStats[f1]) {
    fileStats[f1] = { format, clones: 0, lines: 0, tokens: 0, duplicates: [] };
  }
  fileStats[f1].clones++;
  fileStats[f1].lines += dup.lines;
  fileStats[f1].tokens += dup.tokens;
  fileStats[f1].duplicates.push(dup);
  
  // Second file (if different)
  const f2 = dup.secondFile.name;
  if (f2 !== f1) {
    if (!fileStats[f2]) {
      fileStats[f2] = { format, clones: 0, lines: 0, tokens: 0, duplicates: [] };
    }
    fileStats[f2].clones++;
    fileStats[f2].lines += dup.lines;
    fileStats[f2].tokens += dup.tokens;
    fileStats[f2].duplicates.push(dup);
  }
}

// Group files by format and sort by duplicated lines descending
const filesByFormat = {};
for (const [file, stats] of Object.entries(fileStats)) {
  const fmt = stats.format;
  if (!filesByFormat[fmt]) filesByFormat[fmt] = [];
  filesByFormat[fmt].push({ file, ...stats });
}
for (const fmt of Object.keys(filesByFormat)) {
  filesByFormat[fmt].sort((a, b) => b.lines - a.lines || b.clones - a.clones);
}

// Get totals from statistics
const stats = data.statistics;
const formats = Object.keys(stats.formats || {}).sort((a, b) => {
  // Sort by duplication % descending
  const pctA = stats.formats[a].total.duplicatedLines / stats.formats[a].total.lines;
  const pctB = stats.formats[b].total.duplicatedLines / stats.formats[b].total.lines;
  return pctB - pctA;
});

const formatIcons = {
  python: '🐍',
  typescript: '📘',
  javascript: '📜',
  tsx: '⚛️',
  jsx: '⚛️',
  java: '☕',
  csharp: '🔷',
  go: '🐹',
  rust: '🦀',
  ruby: '💎',
  php: '🐘',
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>jscpd Report - Copy/Paste Detection</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --card: #16213e;
      --accent: #0f3460;
      --text: #e8e8e8;
      --muted: #a0a0a0;
      --success: #4ade80;
      --warning: #fbbf24;
      --danger: #f87171;
      --border: #2d3748;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    h1 { margin-bottom: 0.5rem; }
    .subtitle { color: var(--muted); margin-bottom: 2rem; }
    .summary-card {
      background: var(--card);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }
    .summary-card h2 { margin-bottom: 1rem; font-size: 1.25rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--muted); font-weight: 500; }
    tr:hover { background: var(--accent); }
    .total-row { font-weight: bold; background: var(--accent); }
    .pct { color: var(--muted); }
    .pct.high { color: var(--danger); }
    .pct.medium { color: var(--warning); }
    .pct.low { color: var(--success); }
    
    .format-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
    .format-card {
      background: var(--card);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .format-card-header {
      padding: 1rem 1.5rem;
      background: var(--accent);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .format-card-header h3 { display: flex; align-items: center; gap: 0.5rem; }
    .format-card-header .stats { display: flex; gap: 1rem; font-size: 0.85rem; }
    .format-card-header .stats span { color: var(--muted); }
    .format-card-body { padding: 0; max-height: 400px; overflow-y: auto; }
    .file-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.15s;
    }
    .file-row:hover { background: var(--accent); }
    .file-row:last-child { border-bottom: none; }
    .file-name {
      font-family: monospace;
      font-size: 0.85rem;
      color: var(--warning);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-stats {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      flex-shrink: 0;
    }
    .file-stats .badge {
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }
    .badge.clones { background: #dc2626; }
    .badge.lines { background: #3b82f6; }
    
    .clone-details {
      display: none;
      background: var(--bg);
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .clone-details.open { display: block; }
    .clone-item {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px dashed var(--border);
      font-size: 0.8rem;
    }
    .clone-item:last-child { border-bottom: none; }
    .clone-file { font-family: monospace; }
    .clone-file .path { color: var(--text); }
    .clone-file .lines { color: var(--muted); }
    
    @media (max-width: 768px) {
      .format-cards { grid-template-columns: 1fr; }
      .clone-item { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <h1>📋 jscpd Report</h1>
  <p class="subtitle">Copy/Paste Detection Results • Generated: ${new Date().toLocaleString()}</p>

  <div class="summary-card">
    <h2>📊 Summary by Format</h2>
    <table>
      <thead>
        <tr>
          <th>Format</th>
          <th>Files</th>
          <th>Total Lines</th>
          <th>Clones</th>
          <th>Duplicated Lines</th>
          <th>Duplicated %</th>
        </tr>
      </thead>
      <tbody>
        ${formats.map(fmt => {
          const f = stats.formats[fmt];
          const pct = f.total.lines > 0 ? (f.total.duplicatedLines / f.total.lines * 100) : 0;
          const pctClass = pct > 7 ? 'high' : pct > 4 ? 'medium' : 'low';
          return `
        <tr>
          <td><strong>${formatIcons[fmt] || '📄'} ${fmt}</strong></td>
          <td>${f.total.sources}</td>
          <td>${f.total.lines.toLocaleString()}</td>
          <td>${f.total.clones}</td>
          <td>${f.total.duplicatedLines.toLocaleString()}</td>
          <td class="pct ${pctClass}">${pct.toFixed(2)}%</td>
        </tr>`;
        }).join('')}
        <tr class="total-row">
          <td>📁 Total</td>
          <td>${stats.total.sources}</td>
          <td>${stats.total.lines.toLocaleString()}</td>
          <td>${stats.total.clones}</td>
          <td>${stats.total.duplicatedLines.toLocaleString()}</td>
          <td class="pct ${stats.total.percentage > 6 ? 'high' : stats.total.percentage > 4 ? 'medium' : 'low'}">${stats.total.percentage.toFixed(2)}%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2>🔍 Details by Format</h2>
  <div class="format-cards">
    ${formats.map(fmt => {
      const f = stats.formats[fmt];
      const files = filesByFormat[fmt] || [];
      const pct = f.total.lines > 0 ? (f.total.duplicatedLines / f.total.lines * 100) : 0;
      const pctClass = pct > 7 ? 'high' : pct > 4 ? 'medium' : 'low';
      
      return `
    <div class="format-card">
      <div class="format-card-header">
        <h3>${formatIcons[fmt] || '📄'} ${fmt}</h3>
        <div class="stats">
          <span>${f.total.clones} clones</span>
          <span class="pct ${pctClass}">${pct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="format-card-body">
        ${files.map((file, idx) => `
        <div class="file-row" onclick="toggleDetails('${fmt}-${idx}')">
          <span class="file-name" title="${file.file}">${file.file}</span>
          <div class="file-stats">
            <span class="badge clones">${file.clones} clones</span>
            <span class="badge lines">${file.lines} lines</span>
          </div>
        </div>
        <div class="clone-details" id="${fmt}-${idx}">
          ${file.duplicates.map(dup => `
          <div class="clone-item">
            <div class="clone-file">
              <span class="path">${dup.firstFile.name}</span><br>
              <span class="lines">L${dup.firstFile.startLoc.line}–${dup.firstFile.endLoc.line}</span>
            </div>
            <div class="clone-file">
              <span class="path">${dup.secondFile.name}</span><br>
              <span class="lines">L${dup.secondFile.startLoc.line}–${dup.secondFile.endLoc.line}</span>
            </div>
          </div>`).join('')}
        </div>`).join('')}
      </div>
    </div>`;
    }).join('')}
  </div>

  <script>
    function toggleDetails(id) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('open');
    }
  </script>
</body>
</html>`;

writeFileSync(resolve(outputPath), html);
console.log(`✅ HTML report generated: ${outputPath}`);
console.log(`   Total: ${stats.total.percentage.toFixed(2)}% duplication (${stats.total.clones} clones)`);
