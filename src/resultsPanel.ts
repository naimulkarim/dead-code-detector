import * as vscode from "vscode";
import { DeadCodeResult } from "./analyzer";

export class ResultsPanel {
  private static currentPanel: vscode.WebviewPanel | undefined;

  static show(
    context: vscode.ExtensionContext,
    results: DeadCodeResult[],
    fileName: string
  ) {
    if (ResultsPanel.currentPanel) {
      ResultsPanel.currentPanel.reveal(vscode.ViewColumn.Beside);
    } else {
      ResultsPanel.currentPanel = vscode.window.createWebviewPanel(
        "deadCodeResults",
        "Dead Code Results",
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      ResultsPanel.currentPanel.onDidDispose(() => {
        ResultsPanel.currentPanel = undefined;
      });
    }

    ResultsPanel.currentPanel.webview.html = buildHtml(results, fileName);

    // Handle "Jump to line" messages from webview
    ResultsPanel.currentPanel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === "jumpTo") {
        const editors = vscode.window.visibleTextEditors;
        const target = editors.find((e) => e.document.fileName === msg.file) ?? editors[0];
        if (target && msg.line) {
          const pos = new vscode.Position(Math.max(0, msg.line - 1), 0);
          target.selection = new vscode.Selection(pos, pos);
          target.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        }
      }
    });
  }
}

function severityColor(s: string) {
  return s === "high" ? "#f87171" : s === "medium" ? "#fb923c" : "#facc15";
}

function categoryIcon(c: string) {
  if (c === "unreachable-logic") return "🚫";
  if (c === "unused-api") return "🔌";
  if (c === "obsolete-feature-flag") return "🚩";
  return "💀";
}

function buildHtml(results: DeadCodeResult[], fileName: string): string {
  const name = fileName.split(/[\\/]/).pop();
  const high = results.filter((r) => r.severity === "high").length;
  const med = results.filter((r) => r.severity === "medium").length;
  const low = results.filter((r) => r.severity === "low").length;

  const cards = results.length === 0
    ? `<div class="empty">✅ No dead code detected in <strong>${name}</strong></div>`
    : results
        .sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 };
          return order[a.severity] - order[b.severity];
        })
        .map(
          (r) => `
        <div class="card">
          <div class="card-header">
            <span class="icon">${categoryIcon(r.category)}</span>
            <span class="msg">${escHtml(r.message)}</span>
            <span class="badge" style="background:${severityColor(r.severity)}">${r.severity}</span>
            ${r.line ? `<button class="jump" onclick="jump(${r.line})">Line ${r.line}</button>` : ""}
          </div>
          <div class="card-body">
            <p class="label">Why it's dead code</p>
            <p>${escHtml(r.explanation)}</p>
            <p class="label">Suggestion</p>
            <p class="suggestion">${escHtml(r.suggestion)}</p>
          </div>
        </div>`
        )
        .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Dead Code Results</title>
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --border: var(--vscode-panel-border);
    --surface: var(--vscode-sideBar-background);
    --accent: var(--vscode-focusBorder);
    --btn: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --font: var(--vscode-font-family);
    --code-bg: var(--vscode-textCodeBlock-background);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 13px; padding: 16px; }
  h1 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
  .subtitle { opacity: 0.6; font-size: 12px; margin-bottom: 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 8px 16px; text-align: center; }
  .stat-num { font-size: 22px; font-weight: 700; }
  .stat-label { font-size: 11px; opacity: 0.65; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
  .card-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; flex-wrap: wrap; }
  .icon { font-size: 16px; }
  .msg { flex: 1; font-weight: 500; min-width: 0; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px; color: #000; text-transform: uppercase; }
  .jump { background: var(--btn); color: var(--btn-fg); border: none; border-radius: 4px; padding: 3px 9px; cursor: pointer; font-size: 11px; white-space: nowrap; }
  .jump:hover { opacity: 0.85; }
  .card-body { padding: 0 14px 12px; border-top: 1px solid var(--border); padding-top: 10px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; opacity: 0.55; margin-bottom: 3px; margin-top: 8px; }
  .suggestion { background: var(--code-bg); border-radius: 4px; padding: 7px 10px; font-size: 12px; }
  .empty { text-align: center; padding: 40px; opacity: 0.7; font-size: 14px; }
  .filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .filter-btn { background: transparent; border: 1px solid var(--border); color: var(--fg); border-radius: 5px; padding: 4px 10px; cursor: pointer; font-size: 11px; }
  .filter-btn.active { background: var(--accent); border-color: var(--accent); }
</style>
</head>
<body>
<h1>💀 Dead Code Report</h1>
<p class="subtitle">${escHtml(name ?? fileName)} · ${results.length} issue${results.length !== 1 ? "s" : ""} found</p>

<div class="stats">
  <div class="stat"><div class="stat-num" style="color:#f87171">${high}</div><div class="stat-label">High</div></div>
  <div class="stat"><div class="stat-num" style="color:#fb923c">${med}</div><div class="stat-label">Medium</div></div>
  <div class="stat"><div class="stat-num" style="color:#facc15">${low}</div><div class="stat-label">Low</div></div>
  <div class="stat"><div class="stat-num">${results.filter(r=>r.category==="unreachable-logic").length}</div><div class="stat-label">🚫 Unreachable</div></div>
  <div class="stat"><div class="stat-num">${results.filter(r=>r.category==="unused-api").length}</div><div class="stat-label">🔌 Unused API</div></div>
  <div class="stat"><div class="stat-num">${results.filter(r=>r.category==="obsolete-feature-flag").length}</div><div class="stat-label">🚩 Feature Flags</div></div>
</div>

<div class="filters">
  <button class="filter-btn active" onclick="filter('all', this)">All</button>
  <button class="filter-btn" onclick="filter('unreachable-logic', this)">🚫 Unreachable Logic</button>
  <button class="filter-btn" onclick="filter('unused-api', this)">🔌 Unused APIs</button>
  <button class="filter-btn" onclick="filter('obsolete-feature-flag', this)">🚩 Feature Flags</button>
</div>

<div id="results">${cards}</div>

<script>
  const vscode = acquireVsCodeApi();
  const allCards = [...document.querySelectorAll('.card')];

  function jump(line) {
    vscode.postMessage({ command: 'jumpTo', line, file: '${escHtml(fileName)}' });
  }

  function filter(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    allCards.forEach((card, i) => {
      const catAttr = card.getAttribute('data-cat');
      card.style.display = (cat === 'all' || catAttr === cat) ? '' : 'none';
    });
  }
</script>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
