import * as vscode from "vscode";
import { analyzeDocument, analyzeWorkspace } from "./analyzer";
import { ResultsPanel } from "./resultsPanel";

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection("deadCode");
  context.subscriptions.push(diagnosticCollection);

  // Analyze current file
  context.subscriptions.push(
    vscode.commands.registerCommand("deadCode.analyzeFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active file to analyze.");
        return;
      }
      const apiKey = getApiKey();
      if (!apiKey) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Dead Code Detector",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: "Analyzing with AI..." });
          try {
            const results = await analyzeDocument(editor.document, apiKey);
            applyDiagnostics(editor.document, results);
            ResultsPanel.show(context, results, editor.document.fileName);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Analysis failed: ${err.message}`);
          }
        }
      );
    })
  );

  // Analyze whole workspace
  context.subscriptions.push(
    vscode.commands.registerCommand("deadCode.analyzeWorkspace", async () => {
      const apiKey = getApiKey();
      if (!apiKey) return;

      const files = await vscode.workspace.findFiles(
        "**/*.{js,ts,jsx,tsx,py}",
        "**/node_modules/**"
      );

      if (files.length === 0) {
        vscode.window.showInformationMessage("No supported files found in workspace.");
        return;
      }

      if (files.length > 20) {
        const confirm = await vscode.window.showWarningMessage(
          `Found ${files.length} files. Analyzing all will use many API tokens. Continue?`,
          "Yes", "Cancel"
        );
        if (confirm !== "Yes") return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Dead Code Detector",
          cancellable: false,
        },
        async (progress) => {
          const allResults: any[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            progress.report({
              message: `Analyzing ${i + 1}/${files.length}: ${vscode.workspace.asRelativePath(file)}`,
            });
            try {
              const doc = await vscode.workspace.openTextDocument(file);
              const results = await analyzeDocument(doc, apiKey);
              applyDiagnostics(doc, results);
              allResults.push(...results.map((r) => ({ ...r, file: file.fsPath })));
            } catch (_) {}
          }
          ResultsPanel.show(context, allResults, "Workspace");
        }
      );
    })
  );

  // Clear diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand("deadCode.clearDiagnostics", () => {
      diagnosticCollection.clear();
      vscode.window.showInformationMessage("Dead code diagnostics cleared.");
    })
  );

  // Auto-analyze on save (optional)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const config = vscode.workspace.getConfiguration("deadCode");
      if (config.get("analyzeOnSave") && isSupportedLanguage(doc)) {
        const apiKey = getApiKey(true);
        if (!apiKey) return;
        try {
          const results = await analyzeDocument(doc, apiKey);
          applyDiagnostics(doc, results);
        } catch (_) {}
      }
    })
  );
}

function getApiKey(silent = false): string | undefined {
  const config = vscode.workspace.getConfiguration("deadCode");
  const key = config.get<string>("anthropicApiKey") || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    if (!silent) {
      vscode.window.showErrorMessage(
        "No Anthropic API key found. Set it in Settings → Dead Code Detector → API Key or as ANTHROPIC_API_KEY env var.",
        "Open Settings"
      ).then((action) => {
        if (action === "Open Settings") {
          vscode.commands.executeCommand("workbench.action.openSettings", "deadCode.anthropicApiKey");
        }
      });
    }
    return undefined;
  }
  return key;
}

function isSupportedLanguage(doc: vscode.TextDocument): boolean {
  return ["javascript", "typescript", "python", "javascriptreact", "typescriptreact"].includes(doc.languageId);
}

function applyDiagnostics(doc: vscode.TextDocument, results: any[]) {
  const config = vscode.workspace.getConfiguration("deadCode");
  const severityKey = config.get<string>("severity", "warning");
  const severityMap: Record<string, vscode.DiagnosticSeverity> = {
    error: vscode.DiagnosticSeverity.Error,
    warning: vscode.DiagnosticSeverity.Warning,
    information: vscode.DiagnosticSeverity.Information,
    hint: vscode.DiagnosticSeverity.Hint,
  };
  const severity = severityMap[severityKey] ?? vscode.DiagnosticSeverity.Warning;

  const diagnostics: vscode.Diagnostic[] = results.map((result) => {
    const line = Math.max(0, (result.line ?? 1) - 1);
    const range = doc.lineAt(Math.min(line, doc.lineCount - 1)).range;
    const diag = new vscode.Diagnostic(range, `[${result.category}] ${result.message}`, severity);
    diag.source = "Dead Code AI";
    diag.code = result.category;
    return diag;
  });

  diagnosticCollection.set(doc.uri, diagnostics);
}

export function deactivate() {
  diagnosticCollection?.dispose();
}
