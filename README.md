# Mention Links

A VSCode extension that brings `@mention` semantics to your markdown files — autocomplete, click-to-navigate, hover previews, backlinks, and color-coded decorations.

## Features

### Autocomplete
Type `@` in any markdown file and get a dropdown of people from your people directory. Suggestions show each person's name and whether their profile exists.

### Click-to-Navigate
`@mentions` become clickable links. Click one to jump directly to that person's profile markdown file.

### Hover Previews
Hover over an `@mention` to see a preview card — the person's profile content and a count of how many times they appear across your workspace.

### Backlinks Panel
Open the **Mention Links** panel in the Explorer sidebar when viewing a person's profile. It lists every file and line that mentions them.

### Color-Coded Decorations
- **Resolved** mentions (profile file exists) appear in teal `#4EC9B0`
- **Unresolved** mentions (no profile yet) appear in grey `#888888`

Colors are fully configurable.

### Create Profile Quick Fix
Hover over an unresolved `@mention` and use the lightbulb quick fix to create a new profile file for that person instantly.

## Getting Started

1. Install the extension
2. Open a workspace that contains markdown files
3. Create a `people/` directory at the workspace root
4. Add profile files: `people/alice.md`, `people/bob.md`, etc.
5. In any markdown file, type `@` to trigger autocomplete

## Configuration

| Setting | Default | Description |
|---|---|---|
| `mentionLinks.peopleDirectory` | `people` | Relative path to directory containing profile markdown files |
| `mentionLinks.mentionPrefix` | `@` | Character prefix that triggers mention recognition |
| `mentionLinks.filePatterns` | `**/*.md` | Glob pattern for files to scan for mentions |
| `mentionLinks.resolvedColor` | `#4EC9B0` | Color for resolved `@mentions` |
| `mentionLinks.unresolvedColor` | `#888888` | Color for unresolved `@mentions` |

## Commands

| Command | Description |
|---|---|
| `Mention Links: Create Person Profile` | Create a new profile file for a person |
| `Mention Links: Refresh Mention Index` | Re-scan the workspace for mentions and profiles |

## Example Workspace Layout

```
my-notes/
├── people/
│   ├── alice.md
│   └── bob.md
├── journal/
│   ├── 2026-01-01.md   # can contain @alice, @bob
│   └── 2026-01-02.md
└── projects/
    └── roadmap.md      # can contain @alice
```

## Development

```bash
npm install
npm run build    # build the extension
npm run watch    # watch mode
npm test         # run tests
npm run package  # create .vsix package
```

## License

[MIT](LICENSE)
