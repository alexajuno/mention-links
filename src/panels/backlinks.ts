import * as vscode from "vscode";
import { PersonRegistry } from "../indexer/person-registry";
import { MentionIndex, MentionReference } from "../indexer/mention-index";

type BacklinkItem = PersonItem | ReferenceItem;

class PersonItem extends vscode.TreeItem {
  readonly type = "person" as const;

  constructor(
    public readonly handle: string,
    public readonly displayName: string,
    public readonly count: number
  ) {
    super(
      `@${handle} — ${displayName}`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    this.description = `${count} mention${count !== 1 ? "s" : ""}`;
    this.iconPath = new vscode.ThemeIcon("person");
  }
}

class ReferenceItem extends vscode.TreeItem {
  readonly type = "reference" as const;

  constructor(ref: MentionReference) {
    const filename = ref.fileUri.path.split("/").pop() || "";
    super(filename, vscode.TreeItemCollapsibleState.None);
    this.description = ref.contextLine;
    this.iconPath = new vscode.ThemeIcon("file");
    this.command = {
      title: "Go to mention",
      command: "vscode.open",
      arguments: [
        ref.fileUri,
        {
          selection: new vscode.Range(
            ref.line,
            ref.startChar,
            ref.line,
            ref.endChar
          ),
        },
      ],
    };
  }
}

export class MentionBacklinksProvider
  implements vscode.TreeDataProvider<BacklinkItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<BacklinkItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private registry: PersonRegistry,
    private mentionIndex: MentionIndex
  ) {
    vscode.window.onDidChangeActiveTextEditor(() => this.refresh());
    registry.onDidChange(() => this.refresh());
    mentionIndex.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: BacklinkItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: BacklinkItem): BacklinkItem[] {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") return [];

    if (element && element instanceof PersonItem) {
      return this.mentionIndex
        .getByHandle(element.handle)
        .sort((a, b) => b.fileUri.path.localeCompare(a.fileUri.path))
        .map((ref) => new ReferenceItem(ref));
    }

    const uri = editor.document.uri;
    const filename = uri.path.split("/").pop() || "";

    const handle = filename.replace(/\.md$/, "");
    if (this.registry.has(handle)) {
      const refs = this.mentionIndex.getByHandle(handle);
      if (refs.length === 0) return [];
      return refs
        .sort((a, b) => b.fileUri.path.localeCompare(a.fileUri.path))
        .map((ref) => new ReferenceItem(ref));
    }

    const mentions = this.mentionIndex.getByFile(uri);
    if (mentions.length === 0) return [];

    const byHandle = new Map<string, MentionReference[]>();
    for (const ref of mentions) {
      const existing = byHandle.get(ref.handle) || [];
      existing.push(ref);
      byHandle.set(ref.handle, existing);
    }

    return Array.from(byHandle.entries()).map(([h, refs]) => {
      const person = this.registry.get(h);
      return new PersonItem(h, person?.displayName || h, refs.length);
    });
  }
}
