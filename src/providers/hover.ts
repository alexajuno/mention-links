import * as vscode from "vscode";
import { PersonRegistry } from "../indexer/person-registry";
import { MentionIndex } from "../indexer/mention-index";
import { parseMentions } from "../utils/mention-parser";

export class MentionHoverProvider implements vscode.HoverProvider {
  constructor(
    private registry: PersonRegistry,
    private mentionIndex: MentionIndex
  ) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    const line = document.lineAt(position).text;
    const mentions = parseMentions(line);

    const mention = mentions.find(
      (m) => position.character >= m.start && position.character <= m.end
    );
    if (!mention) return undefined;

    const person = this.registry.get(mention.handle);
    const count = this.mentionIndex.getCount(mention.handle);
    const lastMention = this.mentionIndex.getLastMention(mention.handle);

    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    if (person) {
      md.appendMarkdown(`**${person.displayName}** \`@${person.handle}\`\n\n`);
      if (person.info.length > 0) {
        md.appendMarkdown(
          person.info.map((i) => `- ${i}`).join("\n") + "\n\n"
        );
      }
    } else {
      md.appendMarkdown(`**@${mention.handle}** *(no profile)*\n\n`);
    }

    md.appendMarkdown(`---\n`);
    md.appendMarkdown(`Mentioned ${count} time${count !== 1 ? "s" : ""}`);

    if (lastMention) {
      const filename = lastMention.fileUri.path.split("/").pop() || "";
      md.appendMarkdown(` · Last: ${filename}`);
    }

    const range = new vscode.Range(
      position.line,
      mention.start,
      position.line,
      mention.end
    );

    return new vscode.Hover(md, range);
  }
}
