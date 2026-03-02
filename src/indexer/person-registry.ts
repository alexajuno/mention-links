import * as vscode from "vscode";

export interface PersonEntry {
  handle: string;
  displayName: string;
  filePath: vscode.Uri;
  info: string[];
}

export function parsePersonFile(
  handle: string,
  content: string
): Omit<PersonEntry, "filePath"> {
  const lines = content.split("\n");

  // Extract display name from first # heading
  let displayName = handle;
  for (const line of lines) {
    const headingMatch = line.match(/^#\s+(.+)/);
    if (headingMatch) {
      displayName = headingMatch[1].trim();
      break;
    }
  }

  // Extract info lines between ## info and next ## heading
  const info: string[] = [];
  let inInfoSection = false;
  for (const line of lines) {
    if (/^##\s+info/i.test(line)) {
      inInfoSection = true;
      continue;
    }
    if (inInfoSection && /^##\s+/.test(line)) {
      break;
    }
    if (inInfoSection) {
      const stripped = line.replace(/^-\s*/, "").trim();
      if (stripped) {
        info.push(stripped);
      }
    }
  }

  return { handle, displayName, info };
}

export class PersonRegistry {
  private people = new Map<string, PersonEntry>();
  private watcher: vscode.FileSystemWatcher | undefined;
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  async initialize(
    workspaceRoot: vscode.Uri,
    peopleDir: string
  ): Promise<void> {
    const peoplePath = vscode.Uri.joinPath(workspaceRoot, peopleDir);

    const pattern = new vscode.RelativePattern(peoplePath, "*.md");
    const files = await vscode.workspace.findFiles(pattern);
    await Promise.all(files.map((uri) => this.loadPerson(uri)));

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.watcher.onDidCreate((uri) => this.loadPerson(uri));
    this.watcher.onDidChange((uri) => this.loadPerson(uri));
    this.watcher.onDidDelete((uri) => this.removePerson(uri));
  }

  private async loadPerson(uri: vscode.Uri): Promise<void> {
    const handle = this.handleFromUri(uri);
    const content = await vscode.workspace.fs
      .readFile(uri)
      .then((buf) => Buffer.from(buf).toString("utf-8"));
    const parsed = parsePersonFile(handle, content);
    this.people.set(handle, { ...parsed, filePath: uri });
    this._onDidChange.fire();
  }

  private removePerson(uri: vscode.Uri): void {
    const handle = this.handleFromUri(uri);
    this.people.delete(handle);
    this._onDidChange.fire();
  }

  private handleFromUri(uri: vscode.Uri): string {
    const filename = uri.path.split("/").pop() || "";
    return filename.replace(/\.md$/, "");
  }

  get(handle: string): PersonEntry | undefined {
    return this.people.get(handle);
  }

  getAll(): PersonEntry[] {
    return Array.from(this.people.values());
  }

  has(handle: string): boolean {
    return this.people.has(handle);
  }

  dispose(): void {
    this.watcher?.dispose();
    this._onDidChange.dispose();
  }
}
