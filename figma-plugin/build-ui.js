const fs = require("fs");
const path = require("path");

const root = __dirname;
const htmlPath = path.join(root, "ui.html");
const cssPath = path.join(root, "ui.css");
const jsPath = path.join(root, "ui.js");
const outPath = path.join(root, "ui.bundle.html");

const html = fs.readFileSync(htmlPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const js = fs.readFileSync(jsPath, "utf8");

const bundled = html
  .replace('<link rel="stylesheet" href="ui.css">', `<style>\n${css}\n</style>`)
  .replace('<script src="ui.js"></script>', `<script>\n${js}\n</script>`);

fs.writeFileSync(outPath, bundled);
console.log(`Built ${path.relative(process.cwd(), outPath)}`);
