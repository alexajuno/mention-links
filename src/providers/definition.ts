import * as vscode from "vscode";
import { PersonRegistry } from "../indexer/person-registry";
import { parseMentions } from "../utils/mention-parser";

function getMentionAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): { handle: string; range: vscode.Range } | undefined {
  const line = document.lineAt(position).text;
  const mentions = parseMentions(line);

  for (const m of mentions) {
    if (position.character >= m.start && position.character <= m.end) {
      return {
        handle: m.handle,
        range: new vscode.Range(
          position.line,
          m.start,
          position.line,
          m.end
        ),
      };
    }
  }
  return undefined;
}

export class MentionDefinitionProvider
  implements vscode.DefinitionProvider
{
  constructor(private registry: PersonRegistry) {}

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Location | undefined {
    const mention = getMentionAtPosition(document, position);
    if (!mention) return undefined;

    const person = this.registry.get(mention.handle);
    if (!person) return undefined;

    return new vscode.Location(person.filePath, new vscode.Position(0, 0));
  }
}

export class MentionDocumentLinkProvider
  implements vscode.DocumentLinkProvider
{
  constructor(private registry: PersonRegistry) {}

  provideDocumentLinks(
    document: vscode.TextDocument
  ): vscode.DocumentLink[] {
    const links: vscode.DocumentLink[] = [];

    for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
      const line = document.lineAt(lineNum).text;
      const mentions = parseMentions(line);

      for (const m of mentions) {
        const person = this.registry.get(m.handle);
        if (!person) continue;

        const range = new vscode.Range(lineNum, m.start, lineNum, m.end);
        const link = new vscode.DocumentLink(range, person.filePath);
        link.tooltip = `Open profile: ${person.displayName}`;
        links.push(link);
      }
    }

    return links;
  }
}
