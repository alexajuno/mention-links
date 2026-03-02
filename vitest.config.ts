import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    deps: {
      inline: ["vscode"],
    },
  },
  resolve: {
    alias: {
      vscode: new URL("./test/__mocks__/vscode.ts", import.meta.url).pathname,
    },
  },
});
