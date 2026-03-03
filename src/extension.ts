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
