# mention-links Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a VSCode extension that provides @mention autocompletion, navigation, hover previews, highlighting, auto-profile creation, and a backlinks panel for markdown-based personal knowledge management.

**Architecture:** File-watcher indexer approach — scan a configurable people directory to build a person registry, scan workspace markdown for @handle patterns to build a mentions index. Both indexes are in-memory, kept live via file watchers. All features register as standard VSCode providers.

**Tech Stack:** TypeScript, VSCode Extension API, esbuild bundler, vitest for unit tests

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.js`
- Create: `.gitignore`
- Create: `.vscodeignore`
- Create: `src/extension.ts` (stub)

**Step 1: Initialize npm and install dependencies**

```bash
cd ~/mention-links
npm init -y
npm install --save-dev typescript @types/vscode @types/node esbuild vitest
```

**Step 2: Write package.json**

Replace the generated package.json with the full extension manifest:

```json
{
  "name": "mention-links",
  "displayName": "Mention Links",
  "description": "Autocompletion, navigation, and backlinks for @mentions in markdown files",
  "version": "0.1.0",
  "publisher": "ajuno",
  "engines": {
    "vscode": "^1.96.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onLanguage:markdown"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "configuration": {
      "title": "Mention Links",
      "properties": {
        "mentionLinks.peopleDirectory": {
          "type": "string",
          "default": "people",
          "description": "Relative path to the directory containing people profile markdown files"
        },
        "mentionLinks.mentionPrefix": {
          "type": "string",
          "default": "@",
          "description": "Character prefix that triggers mention recognition"
        },
        "mentionLinks.filePatterns": {
          "type": "string",
          "default": "**/*.md",
          "description": "Glob pattern for files to scan for mentions"
        },
        "mentionLinks.resolvedColor": {
          "type": "string",
          "default": "#4EC9B0",
          "description": "Color for resolved @mentions (profile exists)"
        },
        "mentionLinks.unresolvedColor": {
          "type": "string",
          "default": "#888888",
          "description": "Color for unresolved @mentions (no profile)"
        }
      }
    },
    "views": {
      "explorer": [
        {
          "id": "mentionLinks.backlinks",
          "name": "Mention Links",
          "when": "resourceLangId == markdown"
        }
      ]
    },
    "commands": [
      {
        "command": "mentionLinks.createProfile",
        "title": "Create Person Profile",
        "category": "Mention Links"
      },
      {
        "command": "mentionLinks.refreshIndex",
        "title": "Refresh Mention Index",
        "category": "Mention Links"
      }
    ]
  },
  "scripts": {
    "build": "node esbuild.js",
    "watch": "node esbuild.js --watch",
    "compile": "tsc -p ./ --noEmit",
    "typecheck": "tsc -p ./ --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "npx @vscode/vsce package",
    "vscode:prepublish": "node esbuild.js --production"
  },
  "devDependencies": {}
}
```

**Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./out",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out"]
}
```

**Step 4: Write esbuild.js**

```javascript
const esbuild = require("esbuild");

const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  external: ["vscode"],
  platform: "node",
  target: "ES2022",
  format: "cjs",
  sourcemap: !isProduction,
  minify: isProduction,
};

if (isWatch) {
  esbuild.context(buildOptions).then((ctx) => {
    ctx.watch();
    console.log("Watching for changes...");
  });
} else {
  esbuild.build(buildOptions).catch(() => process.exit(1));
}
```

**Step 5: Write .gitignore and .vscodeignore**

`.gitignore`:
```
node_modules/
out/
*.vsix
```

`.vscodeignore`:
```
src/
test/
node_modules/
.gitignore
tsconfig.json
esbuild.js
**/*.map
```

**Step 6: Write stub extension.ts**

```typescript
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("mention-links activated");
}

export function deactivate() {}
```

**Step 7: Build and verify**

```bash
npm run build
```

Expected: `out/extension.js` is generated with no errors.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold extension project with build tooling"
```

---

### Task 2: Mention Parser Utility

**Files:**
- Create: `src/utils/mention-parser.ts`
- Create: `test/mention-parser.test.ts`

**Step 1: Write the failing tests**

Create `test/mention-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseMentions } from "../src/utils/mention-parser";

describe("parseMentions", () => {
  it("extracts a single @mention", () => {
    const result = parseMentions("had lunch with @phuongtq today");
    expect(result).toEqual([
      { handle: "phuongtq", start: 15, end: 24 },
    ]);
  });

  it("extracts multiple @mentions", () => {
    const result = parseMentions("met @chinhdt and @minhnv at work");
    expect(result).toEqual([
      { handle: "chinhdt", start: 4, end: 12 },
      { handle: "minhnv", start: 17, end: 24 },
    ]);
  });

  it("handles dots and hyphens in handles", () => {
    const result = parseMentions("texted @mai.anh and @tuan-anh");
    expect(result).toEqual([
      { handle: "mai.anh", start: 7, end: 15 },
      { handle: "tuan-anh", start: 20, end: 29 },
    ]);
  });

  it("ignores email addresses", () => {
    const result = parseMentions("email user@domain.com please");
    expect(result).toEqual([]);
  });

  it("matches @mention at start of line", () => {
    const result = parseMentions("@phuongtq was there");
    expect(result).toEqual([
      { handle: "phuongtq", start: 0, end: 9 },
    ]);
  });

  it("returns empty array for no mentions", () => {
    const result = parseMentions("a normal line with no mentions");
    expect(result).toEqual([]);
  });

  it("ignores @mention inside inline code", () => {
    const result = parseMentions("`@notamention` but @real is");
    expect(result).toEqual([
      { handle: "real", start: 19, end: 24 },
    ]);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run test/mention-parser.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `src/utils/mention-parser.ts`:

```typescript
export interface MentionMatch {
  handle: string;
  start: number;
  end: number;
}

export const MENTION_PATTERN = /(?<![a-zA-Z0-9_])@([a-zA-Z][a-zA-Z0-9._-]*)/g;

const INLINE_CODE_PATTERN = /`[^`]*`/g;

export function parseMentions(text: string): MentionMatch[] {
  // Mask inline code spans so @mentions inside them are ignored
  const masked = text.replace(INLINE_CODE_PATTERN, (match) =>
    " ".repeat(match.length)
  );

  const matches: MentionMatch[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  MENTION_PATTERN.lastIndex = 0;

  while ((match = MENTION_PATTERN.exec(masked)) !== null) {
    matches.push({
      handle: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return matches;
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run test/mention-parser.test.ts
```

Expected: All 7 tests PASS.

**Step 5: Commit**

```bash
git add src/utils/mention-parser.ts test/mention-parser.test.ts
git commit -m "feat: add mention parser with regex extraction"
```

---

### Task 3: Person Registry

**Files:**
- Create: `src/indexer/person-registry.ts`
- Create: `test/person-registry.test.ts`

**Step 1: Write the failing tests**

Create `test/person-registry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parsePersonFile } from "../src/indexer/person-registry";

describe("parsePersonFile", () => {
  it("extracts display name from heading", () => {
    const content = "# Phuong Tran\n\n## info\n- developer\n\n## lines\n";
    const result = parsePersonFile("phuongtq", content);
    expect(result.handle).toBe("phuongtq");
    expect(result.displayName).toBe("Phuong Tran");
  });

  it("extracts info lines", () => {
    const content = "# Phuong\n\n## info\n- developer at XYZ\n- Hanoi\n\n## lines\n- 2026-01-01: met at party\n";
    const result = parsePersonFile("phuongtq", content);
    expect(result.info).toEqual(["developer at XYZ", "Hanoi"]);
  });

  it("uses handle as display name when no heading", () => {
    const content = "## info\n- some info\n";
    const result = parsePersonFile("phuongtq", content);
    expect(result.displayName).toBe("phuongtq");
  });

  it("handles empty file", () => {
    const result = parsePersonFile("phuongtq", "");
    expect(result.handle).toBe("phuongtq");
    expect(result.displayName).toBe("phuongtq");
    expect(result.info).toEqual([]);
  });

  it("extracts heading with parenthetical handle", () => {
    const content = "# Minh (minhnt)\n\n## info\n- CTO\n";
    const result = parsePersonFile("minhnt", content);
    expect(result.displayName).toBe("Minh (minhnt)");
    expect(result.info).toEqual(["CTO"]);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run test/person-registry.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `src/indexer/person-registry.ts`:

```typescript
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

    // Scan existing files
    const pattern = new vscode.RelativePattern(peoplePath, "*.md");
    const files = await vscode.workspace.findFiles(pattern);
    await Promise.all(files.map((uri) => this.loadPerson(uri)));

    // Watch for changes
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
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run test/person-registry.test.ts
```

Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add src/indexer/person-registry.ts test/person-registry.test.ts
git commit -m "feat: add person registry with file parsing and watcher"
```

---

### Task 4: Mention Index

**Files:**
- Create: `src/indexer/mention-index.ts`
- Create: `test/mention-index.test.ts`

**Step 1: Write the failing tests**

Create `test/mention-index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { indexMentionsInText } from "../src/indexer/mention-index";

describe("indexMentionsInText", () => {
  it("indexes mentions with line and column positions", () => {
    const text = "first line\nhad lunch with @phuongtq\nthird line";
    const result = indexMentionsInText(text);
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe("phuongtq");
    expect(result[0].line).toBe(1);
    expect(result[0].contextLine).toBe("had lunch with @phuongtq");
  });

  it("indexes multiple mentions across lines", () => {
    const text = "met @chinhdt\nlater saw @minhnv";
    const result = indexMentionsInText(text);
    expect(result).toHaveLength(2);
    expect(result[0].handle).toBe("chinhdt");
    expect(result[0].line).toBe(0);
    expect(result[1].handle).toBe("minhnv");
    expect(result[1].line).toBe(1);
  });

  it("returns empty for no mentions", () => {
    const result = indexMentionsInText("nothing here");
    expect(result).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run test/mention-index.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `src/indexer/mention-index.ts`:

```typescript
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
  // handle -> MentionReference[]
  private byHandle = new Map<string, MentionReference[]>();
  // fileUri.toString() -> MentionReference[]
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

    // Remove old references for this file
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
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run test/mention-index.test.ts
```

Expected: All 3 tests PASS.

**Step 5: Commit**

```bash
git add src/indexer/mention-index.ts test/mention-index.test.ts
git commit -m "feat: add mention index with file scanning and watcher"
```

---

### Task 5: Completion Provider

**Files:**
- Create: `src/providers/completion.ts`

**Step 1: Write the completion provider**

```typescript
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

    // Check if we're after an @ that looks like a mention trigger
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

        // Replace the @ and any partial text already typed
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
```

**Step 2: Commit**

```bash
git add src/providers/completion.ts
git commit -m "feat: add completion provider for @mention autocomplete"
```

---

### Task 6: Definition & DocumentLink Provider

**Files:**
- Create: `src/providers/definition.ts`

**Step 1: Write the providers**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/providers/definition.ts
git commit -m "feat: add definition and document link providers for navigation"
```

---

### Task 7: Hover Provider

**Files:**
- Create: `src/providers/hover.ts`

**Step 1: Write the hover provider**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/providers/hover.ts
git commit -m "feat: add hover provider with profile preview and mention stats"
```

---

### Task 8: Decoration Provider

**Files:**
- Create: `src/providers/decoration.ts`

**Step 1: Write the decoration provider**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/providers/decoration.ts
git commit -m "feat: add decoration provider for mention highlighting"
```

---

### Task 9: Create Profile Code Action

**Files:**
- Create: `src/actions/create-profile.ts`

**Step 1: Write the code action provider and command**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/actions/create-profile.ts
git commit -m "feat: add create profile code action and command"
```

---

### Task 10: Backlinks Panel

**Files:**
- Create: `src/panels/backlinks.ts`

**Step 1: Write the tree data provider**

```typescript
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

    // If expanding a person item, show their mention references
    if (element && element instanceof PersonItem) {
      return this.mentionIndex
        .getByHandle(element.handle)
        .sort((a, b) => b.fileUri.path.localeCompare(a.fileUri.path))
        .map((ref) => new ReferenceItem(ref));
    }

    const uri = editor.document.uri;
    const filename = uri.path.split("/").pop() || "";

    // If active file is a person profile, show who mentions this person
    const handle = filename.replace(/\.md$/, "");
    if (this.registry.has(handle)) {
      const refs = this.mentionIndex.getByHandle(handle);
      if (refs.length === 0) return [];
      return refs
        .sort((a, b) => b.fileUri.path.localeCompare(a.fileUri.path))
        .map((ref) => new ReferenceItem(ref));
    }

    // Otherwise, show all people mentioned in the active file
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
```

**Step 2: Commit**

```bash
git add src/panels/backlinks.ts
git commit -m "feat: add backlinks tree panel for mention navigation"
```

---

### Task 11: Extension Entry Point (Wire Everything)

**Files:**
- Modify: `src/extension.ts`

**Step 1: Replace the stub with the full entry point**

```typescript
import * as vscode from "vscode";
import { PersonRegistry } from "./indexer/person-registry";
import { MentionIndex } from "./indexer/mention-index";
import { MentionCompletionProvider } from "./providers/completion";
import {
  MentionDefinitionProvider,
  MentionDocumentLinkProvider,
} from "./providers/definition";
import { MentionHoverProvider } from "./providers/hover";
import { MentionDecorationProvider } from "./providers/decoration";
import { MentionBacklinksProvider } from "./panels/backlinks";
import {
  CreateProfileAction,
  registerCreateProfileCommand,
} from "./actions/create-profile";

const MARKDOWN_SELECTOR: vscode.DocumentSelector = { language: "markdown" };

export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceRoot) return;

  const config = vscode.workspace.getConfiguration("mentionLinks");
  const peopleDir = config.get<string>("peopleDirectory", "people");
  const filePattern = config.get<string>("filePatterns", "**/*.md");

  const registry = new PersonRegistry();
  const mentionIndex = new MentionIndex();

  await Promise.all([
    registry.initialize(workspaceRoot, peopleDir),
    mentionIndex.initialize(filePattern),
  ]);

  // Completion
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      MARKDOWN_SELECTOR,
      new MentionCompletionProvider(registry, mentionIndex),
      "@"
    )
  );

  // Definition + Document Links
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      MARKDOWN_SELECTOR,
      new MentionDefinitionProvider(registry)
    ),
    vscode.languages.registerDocumentLinkProvider(
      MARKDOWN_SELECTOR,
      new MentionDocumentLinkProvider(registry)
    )
  );

  // Hover
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      MARKDOWN_SELECTOR,
      new MentionHoverProvider(registry, mentionIndex)
    )
  );

  // Decorations
  const decorationProvider = new MentionDecorationProvider(registry);
  context.subscriptions.push(decorationProvider);

  // Backlinks panel
  const backlinksProvider = new MentionBacklinksProvider(registry, mentionIndex);
  const treeView = vscode.window.createTreeView("mentionLinks.backlinks", {
    treeDataProvider: backlinksProvider,
  });
  context.subscriptions.push(treeView);

  // Code actions (create profile)
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      MARKDOWN_SELECTOR,
      new CreateProfileAction(registry, workspaceRoot, peopleDir),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  // Create profile command
  context.subscriptions.push(
    registerCreateProfileCommand(workspaceRoot, peopleDir)
  );

  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("mentionLinks.refreshIndex", async () => {
      await Promise.all([
        registry.initialize(workspaceRoot, peopleDir),
        mentionIndex.initialize(filePattern),
      ]);
      vscode.window.showInformationMessage("Mention Links: Index refreshed");
    })
  );

  // Cleanup
  context.subscriptions.push(registry, mentionIndex);
}

export function deactivate() {}
```

**Step 2: Commit**

```bash
git add src/extension.ts
git commit -m "feat: wire up extension entry point with all providers"
```

---

### Task 12: Build, Test, Fix

**Step 1: Run typecheck**

```bash
cd ~/mention-links && npm run typecheck
```

Fix any type errors.

**Step 2: Build the extension**

```bash
npm run build
```

Expected: `out/extension.js` generated successfully.

**Step 3: Run unit tests**

```bash
npm test
```

Expected: All 15 tests pass.

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve build and type errors"
```

---

### Task 13: Manual Test & Package

**Step 1: Test in VSCode Extension Development Host**

Press F5 in the extension project to launch the dev host. Open `~/life` workspace. Verify:
- Typing `@` shows autocomplete with people from `people/` dir
- Ctrl+Click on `@phuongtq` navigates to `people/phuongtq.md`
- Hovering over `@phuongtq` shows profile preview with mention count
- `@mentions` appear colored (green=resolved, grey=unresolved)
- Lightbulb on unresolved mentions offers "Create profile"
- Backlinks panel shows relevant mentions based on active file

**Step 2: Package the extension**

```bash
npx @vscode/vsce package
```

Expected: `mention-links-0.1.0.vsix` generated.

**Step 3: Install locally**

```bash
code --install-extension mention-links-0.1.0.vsix
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: prepare v0.1.0 for local installation"
```
