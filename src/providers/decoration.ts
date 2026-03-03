import * as vscode from "vscode";
import { PersonRegistry } from "../indexer/person-registry";
import { parseMentions } from "../utils/mention-parser";

export class MentionDecorationProvider implements vscode.Disposable {
  private resolvedDecoration: vscode.TextEditorDecorationType;
  private unresolvedDecoration: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];

  constructor(private registry: PersonRegistry) {
    const config = vscode.workspace.getConfiguration("mentionLinks");

    this.resolvedDecoration = vscode.window.createTextEditorDecorationType({
      color: config.get("resolvedColor", "#4EC9B0"),
      textDecoration: "underline",
    });

    this.unresolvedDecoration = vscode.window.createTextEditorDecorationType({
      color: config.get("unresolvedColor", "#888888"),
      fontStyle: "italic",
    });

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) this.updateDecorations(editor);
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && e.document === editor.document) {
          this.updateDecorations(editor);
        }
      }),
      registry.onDidChange(() => {
        const editor = vscode.window.activeTextEditor;
        if (editor) this.updateDecorations(editor);
      })
    );

    if (vscode.window.activeTextEditor) {
      this.updateDecorations(vscode.window.activeTextEditor);
    }
  }

  private updateDecorations(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== "markdown") return;

    const resolved: vscode.DecorationOptions[] = [];
    const unresolved: vscode.DecorationOptions[] = [];

    for (let lineNum = 0; lineNum < editor.document.lineCount; lineNum++) {
      const line = editor.document.lineAt(lineNum).text;
      const mentions = parseMentions(line);

      for (const m of mentions) {
        const range = new vscode.Range(lineNum, m.start, lineNum, m.end);
        const decoration = { range };

        if (this.registry.has(m.handle)) {
          resolved.push(decoration);
        } else {
          unresolved.push(decoration);
        }
      }
    }

    editor.setDecorations(this.resolvedDecoration, resolved);
    editor.setDecorations(this.unresolvedDecoration, unresolved);
  }

  dispose(): void {
    this.resolvedDecoration.dispose();
    this.unresolvedDecoration.dispose();
    for (const d of this.disposables) d.dispose();
  }
}
