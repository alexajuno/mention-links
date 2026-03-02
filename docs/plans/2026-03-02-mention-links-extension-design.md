# mention-links — VSCode Extension Design

## Overview

A standalone VSCode extension that adds `@mention` autocompletion, navigation, hover previews, highlighting, auto-profile creation, and a backlinks panel for markdown-based personal knowledge management.

Works alongside Foam (or any markdown tool) without modifying it.

## Approach

**File-Watcher Indexer** — on activation, scans a configurable people directory for `.md` files to build a person registry, and scans workspace markdown for `@handle` patterns to build a mentions index. File watchers keep both indexes live. All state is in-memory (no persistence needed).

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `mentionLinks.peopleDirectory` | `people` | Relative path to people profile directory |
| `mentionLinks.mentionPrefix` | `@` | Character that triggers mentions |
| `mentionLinks.filePatterns` | `**/*.md` | Glob for files to scan for mentions |
| `mentionLinks.profileTemplate` | (built-in) | Template for new person profiles |

Handles are derived from filenames: `people/phuongtq.md` → `@phuongtq`.

## Data Model

```
PersonEntry {
  handle: string          // "phuongtq" (from filename)
  displayName: string     // "Phuong" (from # heading in file)
  filePath: URI           // people/phuongtq.md
  info: string[]          // First few lines from ## info section
}

MentionReference {
  handle: string          // "phuongtq"
  fileUri: URI            // daily/2026-03-01.md
  range: Range            // line/col position of the @mention
  contextLine: string     // "had lunch with @phuongtq, decent conversation"
}
```

## Features

### A. Autocompletion
- **Trigger:** `@` character in markdown files
- **Provider:** `CompletionItemProvider`
- **Behavior:** Fuzzy-match against handles and display names, show info snippet
- **Result:** Inserts `@handle`

### B. Click-to-Navigate
- **Providers:** `DefinitionProvider` + `DocumentLinkProvider`
- **Behavior:** Ctrl+Click / F12 on `@handle` opens `people/handle.md`

### C. Hover Preview
- **Provider:** `HoverProvider`
- **Content:** Display name, info section, mention count, last mentioned date
- **Size:** Compact, 5-8 lines

### D. Mention Highlighting
- **Mechanism:** `createTextEditorDecorationType`
- **Resolved mentions:** Distinct color + underline
- **Unresolved mentions:** Dimmed/warning style

### E. Auto-Create Profile
- **Trigger:** Code action on unresolved `@handle`
- **Action:** Creates `people/handle.md` from template
- **Default template:**
  ```markdown
  # {displayName}

  ## info

  ## lines
  ```

### F. Backlinks Panel
- **View:** TreeView in sidebar
- **On person file active:** Shows all entries mentioning this person, grouped by date
- **On daily entry active:** Shows all people mentioned in that entry
- **Click:** Navigates to mention location

## Mention Parsing

```regex
/(?<![a-zA-Z0-9_])@([a-zA-Z][a-zA-Z0-9._-]*)/g
```

Avoids email false positives via negative lookbehind.

## Project Structure

```
mention-links/
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts
│   ├── indexer/
│   │   ├── person-registry.ts
│   │   └── mention-index.ts
│   ├── providers/
│   │   ├── completion.ts
│   │   ├── definition.ts
│   │   ├── hover.ts
│   │   └── decoration.ts
│   ├── panels/
│   │   └── backlinks.ts
│   ├── actions/
│   │   └── create-profile.ts
│   └── utils/
│       └── mention-parser.ts
├── test/
│   └── suite/
│       ├── mention-parser.test.ts
│       ├── person-registry.test.ts
│       └── mention-index.test.ts
└── README.md
```

## Tech Stack

- TypeScript + VSCode Extension API
- No external dependencies beyond `@types/vscode`
- Build with esbuild
- Tests with `@vscode/test-electron`
