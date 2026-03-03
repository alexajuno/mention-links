import * as vscode from "vscode";
import { PersonRegistry } from "../indexer/person-registry";
import { MentionIndex } from "../indexer/mention-index";

export class MentionCompletionProvider
  implements vscode.CompletionItemProvider
{
  constructor(
    private registry: PersonRegistry,
    private mentionIndex: MentionIndex
  ) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const lineText = document.lineAt(position).text;
    const textBefore = lineText.substring(0, position.character);

    const triggerMatch = textBefore.match(/@([a-zA-Z0-9._-]*)$/);
    if (!triggerMatch) return undefined;

    const typed = triggerMatch[1].toLowerCase();
    const people = this.registry.getAll();

    return people
      .filter(
        (p) =>
          p.handle.toLowerCase().includes(typed) ||
          p.displayName.toLowerCase().includes(typed)
      )
      .map((p) => {
        const item = new vscode.CompletionItem(
          `@${p.handle}`,
          vscode.CompletionItemKind.User
        );
        item.detail = p.displayName;
        item.documentation = new vscode.MarkdownString(
          p.info.length > 0
            ? p.info.map((i) => `- ${i}`).join("\n")
            : "*No info available*"
        );

        const replaceStart = position.character - triggerMatch[0].length;
        item.range = new vscode.Range(
          position.line,
          replaceStart,
          position.line,
          position.character
        );
        item.insertText = `@${p.handle}`;

        const count = this.mentionIndex.getCount(p.handle);
        item.sortText = String(99999 - count).padStart(5, "0");

        return item;
      });
  }
}
