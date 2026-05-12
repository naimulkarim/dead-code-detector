import * as vscode from "vscode";

export interface DeadCodeResult {
  category: "unreachable-logic" | "unused-api" | "obsolete-feature-flag" | "dead-code";
  message: string;
  explanation: string;
  suggestion: string;
  line?: number;
  severity: "high" | "medium" | "low";
}

const SYSTEM_PROMPT = `You are an expert static analysis tool specializing in dead code detection. 
Analyze the provided source code and identify:

1. **Unreachable Business Logic** — code after unconditional returns, inside impossible conditions 
   (e.g. \`if (false)\`, \`if (1 === 2)\`), catch blocks that swallow everything, etc.

2. **Unused APIs / Functions** — exported or defined functions/classes/variables that appear 
   to never be called or referenced within the file. Flag internal ones clearly.

3. **Obsolete Feature Flags** — boolean constants or config checks that are hardcoded to true/false, 
   e.g. \`const FEATURE_X = false\` used in conditions, or \`if (flags.oldFeature)\` style patterns 
   where the flag is clearly always true or false.

Respond ONLY with a JSON array (no markdown, no preamble). Each item must have:
{
  "category": "unreachable-logic" | "unused-api" | "obsolete-feature-flag" | "dead-code",
  "message": "Short one-line summary (< 80 chars)",
  "explanation": "2-3 sentences explaining why this is dead/obsolete code",
  "suggestion": "What to do — remove, refactor, or clean up",
  "line": <integer line number where the issue starts, or null>,
  "severity": "high" | "medium" | "low"
}

Be precise. Only flag genuine issues, not just unused parameters or standard patterns.
Return [] if no issues found.`;

export async function analyzeDocument(
  doc: vscode.TextDocument,
  apiKey: string
): Promise<DeadCodeResult[]> {
  const config = vscode.workspace.getConfiguration("deadCode");
  const checks = config.get<Record<string, boolean>>("checks", {
    unreachableLogic: true,
    unusedApis: true,
    obsoleteFeatureFlags: true,
  });

  const code = doc.getText();
  if (code.trim().length < 10) return [];

  // Build a focused prompt based on enabled checks
  const enabledChecks: string[] = [];
  if (checks.unreachableLogic) enabledChecks.push("unreachable business logic");
  if (checks.unusedApis) enabledChecks.push("unused APIs and functions");
  if (checks.obsoleteFeatureFlags) enabledChecks.push("obsolete feature flags");

  if (enabledChecks.length === 0) {
    vscode.window.showWarningMessage("All checks are disabled in Dead Code Detector settings.");
    return [];
  }

  const userMessage = `Language: ${doc.languageId}
File: ${doc.fileName.split(/[\\/]/).pop()}
Enabled checks: ${enabledChecks.join(", ")}

\`\`\`${doc.languageId}
${code.slice(0, 12000)}  
\`\`\`

Return only the JSON array.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(err?.error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json() as any;
  const text: string = data.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  // Strip possible markdown fences
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Dead Code Detector: Failed to parse AI response", clean);
    return [];
  }
}
