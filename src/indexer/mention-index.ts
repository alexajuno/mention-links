import * as vscode from "vscode";
import { parseMentions } from "../utils/mention-parser";

export interface MentionReference {
  handle: string;
  fileUri: vscode.Uri;
  line: number;
  startChar: number;
  endChar: number;
  contextLine: string;
}

export interface TextMentionReference {
  handle: string;
  line: number;
  startChar: number;
  endChar: number;
  contextLine: string;
}

export function indexMentionsInText(text: string): TextMentionReference[] {
  const lines = text.split("\n");
  const refs: TextMentionReference[] = [];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const mentions = parseMentions(line);
    for (const m of mentions) {
      refs.push({
        handle: m.handle,
        line: lineNum,
        startChar: m.start,
        endChar: m.end,
        contextLine: line.trim(),
      });
    }
  }

  return refs;
}

export class MentionIndex {
  private byHandle = new Map<string, MentionReference[]>();
  private byFile = new Map<string, MentionReference[]>();
  private watcher: vscode.FileSystemWatcher | undefined;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  async initialize(filePattern: string): Promise<void> {
    const files = await vscode.workspace.findFiles(filePattern);
    await Promise.all(files.map((uri) => this.indexFile(uri)));

    this.watcher = vscode.workspace.createFileSystemWatcher(filePattern);
    this.watcher.onDidCreate((uri) => this.debouncedIndex(uri));
    this.watcher.onDidChange((uri) => this.debouncedIndex(uri));
    this.watcher.onDidDelete((uri) => this.removeFile(uri));
  }

  private debouncedIndex(uri: vscode.Uri): void {
    const key = uri.toString();
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.indexFile(uri);
        this.debounceTimers.delete(key);
      }, 500)
    );
  }

  private async indexFile(uri: vscode.Uri): Promise<void> {
    const content = await vscode.workspace.fs
      .readFile(uri)
      .then((buf) => Buffer.from(buf).toString("utf-8"));

    this.removeFile(uri);

    const textRefs = indexMentionsInText(content);
    const refs: MentionReference[] = textRefs.map((r) => ({
      ...r,
      fileUri: uri,
    }));

    if (refs.length === 0) return;

    this.byFile.set(uri.toString(), refs);

    for (const ref of refs) {
      const existing = this.byHandle.get(ref.handle) || [];
      existing.push(ref);
      this.byHandle.set(ref.handle, existing);
    }

    this._onDidChange.fire();
  }

  private removeFile(uri: vscode.Uri): void {
    const key = uri.toString();
    const refs = this.byFile.get(key);
    if (!refs) return;

    for (const ref of refs) {
      const handleRefs = this.byHandle.get(ref.handle);
      if (handleRefs) {
        const filtered = handleRefs.filter(
          (r) => r.fileUri.toString() !== key
        );
        if (filtered.length > 0) {
          this.byHandle.set(ref.handle, filtered);
        } else {
          this.byHandle.delete(ref.handle);
        }
      }
    }

    this.byFile.delete(key);
    this._onDidChange.fire();
  }

  getByHandle(handle: string): MentionReference[] {
    return this.byHandle.get(handle) || [];
  }

  getByFile(uri: vscode.Uri): MentionReference[] {
    return this.byFile.get(uri.toString()) || [];
  }

  getAllHandles(): string[] {
    return Array.from(this.byHandle.keys());
  }

  getCount(handle: string): number {
    return this.getByHandle(handle).length;
  }

  getLastMention(handle: string): MentionReference | undefined {
    const refs = this.getByHandle(handle);
    if (refs.length === 0) return undefined;
    return refs.sort((a, b) =>
      b.fileUri.path.localeCompare(a.fileUri.path)
    )[0];
  }

  dispose(): void {
    this.watcher?.dispose();
    this._onDidChange.dispose();
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
  }
}
