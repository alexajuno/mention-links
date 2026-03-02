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
