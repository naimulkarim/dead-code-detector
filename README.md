# 💀 Dead Code Detector (AI-Powered)

A VS Code extension that uses Claude AI to find dead code that traditional static analysis misses.

## What it detects

| Category | Examples |
|---|---|
| 🚫 **Unreachable Logic** | Code after `return`, impossible `if` conditions, catch blocks that hide errors |
| 🔌 **Unused APIs** | Exported functions never called, orphaned classes, unused variables |
| 🚩 **Obsolete Feature Flags** | `const FEATURE_X = false` guards, hardcoded toggles, deprecated flag checks |

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Anthropic API key

**Option A — Settings UI:**
1. Open VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "Dead Code"
3. Paste your key into **Dead Code Detector: Anthropic Api Key**

**Option B — Environment variable:**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run the extension

Press `F5` in VS Code to open a new Extension Development Host window.

## Usage

| Action | How |
|---|---|
| Analyze current file | `Cmd+Shift+D` / `Ctrl+Shift+D` |
| Analyze current file | Right-click → "Dead Code: Analyze Current File" |
| Analyze workspace | Command Palette → "Dead Code: Analyze Entire Workspace" |
| Clear diagnostics | Command Palette → "Dead Code: Clear All Diagnostics" |

Results appear as:
- **Inline squiggles** in the editor (Problems panel)
- **Results panel** (opens beside your editor) with filtering, severity badges, and jump-to-line

## Configuration

```json
// settings.json
{
  "deadCode.anthropicApiKey": "sk-ant-...",
  "deadCode.severity": "warning",        // error | warning | information | hint
  "deadCode.checks": {
    "unreachableLogic": true,
    "unusedApis": true,
    "obsoleteFeatureFlags": true
  }
}
```

## Supported Languages
- JavaScript / TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- Python (`.py`)

## Project Structure

```
src/
  extension.ts      # Entry point, command registration, diagnostics
  analyzer.ts       # Claude API call + prompt engineering
  resultsPanel.ts   # Webview results panel (HTML/CSS/JS)
package.json        # Extension manifest, commands, config schema
tsconfig.json
```

## Architecture

```
User triggers command
        ↓
extension.ts → reads file + config
        ↓
analyzer.ts → calls claude-sonnet-4 with structured prompt
        ↓
Claude returns JSON array of issues
        ↓
extension.ts → creates VS Code Diagnostics (squiggles)
        ↓
resultsPanel.ts → renders filterable HTML panel
```

## Extending

To add a new language, add it to `activationEvents` and `isSupportedLanguage()` in `extension.ts`.

To add a new check category, update the system prompt in `analyzer.ts` and add the category to the `DeadCodeResult` type.
