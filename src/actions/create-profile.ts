import * as vscode from "vscode";
import { PersonRegistry } from "../indexer/person-registry";
import { parseMentions } from "../utils/mention-parser";

const DEFAULT_TEMPLATE = `# {handle}

## info

## lines
`;

export class CreateProfileAction implements vscode.CodeActionProvider {
  constructor(
    private registry: PersonRegistry,
    private workspaceRoot: vscode.Uri,
    private peopleDir: string
  ) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] {
    const line = document.lineAt(range.start.line).text;
    const mentions = parseMentions(line);

    const actions: vscode.CodeAction[] = [];

    for (const m of mentions) {
      if (range.start.character > m.end || range.end.character < m.start) {
        continue;
      }
      if (this.registry.has(m.handle)) continue;

      const action = new vscode.CodeAction(
        `Create profile for @${m.handle}`,
        vscode.CodeActionKind.QuickFix
      );
      action.command = {
        title: `Create profile for @${m.handle}`,
        command: "mentionLinks.createProfile",
        arguments: [m.handle],
      };
      actions.push(action);
    }

    return actions;
  }
}

export function registerCreateProfileCommand(
  workspaceRoot: vscode.Uri,
  peopleDir: string
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "mentionLinks.createProfile",
    async (handle?: string) => {
      if (!handle) {
        handle = await vscode.window.showInputBox({
          prompt: "Enter person handle",
          placeHolder: "e.g. phuongtq",
        });
      }
      if (!handle) return;

      const config = vscode.workspace.getConfiguration("mentionLinks");
      const template = config.get<string>("profileTemplate") || DEFAULT_TEMPLATE;
      const content = template.replace(/\{handle\}/g, handle);
      const fileUri = vscode.Uri.joinPath(workspaceRoot, peopleDir, `${handle}.md`);

      try {
        await vscode.workspace.fs.stat(fileUri);
        vscode.window.showWarningMessage(`Profile already exists: ${handle}.md`);
        const doc = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(doc);
      } catch {
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, "utf-8"));
        const doc = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(doc);
      }
    }
  );
}
