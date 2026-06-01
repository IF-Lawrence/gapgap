const fs = require("fs");
const vm = require("vm");

function decodeHtml(html) {
  return html
    .replace(/<br>/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function loadChromeFormatter() {
  const code = fs.readFileSync("chrome-extension/core.js", "utf8");
  const sandbox = {
    window: {},
    chrome: {
      storage: {
        local: {
          get() {},
          set() {}
        }
      }
    }
  };
  vm.runInNewContext(code, sandbox);
  return (value) => sandbox.window.GapGapCore.formatAndHighlight(value).text;
}

function loadFigmaFormatter() {
  const code = fs.readFileSync("figma-plugin/code.js", "utf8")
    .split("\nasync function getData()")[0] + "\nthis.formatText = formatText;";
  const sandbox = {};
  vm.runInNewContext(code, sandbox);
  return (value) => sandbox.formatText(value).text;
}

function loadWebFormatter() {
  const html = fs.readFileSync("index.html", "utf8");
  const formatStart = html.indexOf("function formatAndHighlight");
  const formatEnd = html.indexOf(" function updateStatus", formatStart);
  if (formatStart < 0 || formatEnd < 0) {
    throw new Error("Could not locate index.html formatter.");
  }

  const code = `
const escapeHTML = e => e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
${html.slice(formatStart, formatEnd)}
this.formatAndHighlight = formatAndHighlight;
`;
  const sandbox = {};
  vm.runInNewContext(code, sandbox);
  return (value) => decodeHtml(sandbox.formatAndHighlight(value));
}

const cases = [
  "在LeanCloud上，数据存储围绕AVObject进行。",
  "在   LeanCloud   上",
  "花了   5000   元，增长15%   的收入",
  "你好,world!这是test?可以:试试;好的(ok)",
  "太棒了！！！真的吗??",
  "访问 https://example.com/a-b?x=1 或发到 hi@example.com",
  "版本v1.2.3发布了",
  "中文   “A”   中文",
  "USB   +   Fast 和 A+中文",
  "缩进    保留",
  "全角１２３数字"
];

const formatters = {
  web: loadWebFormatter(),
  chrome: loadChromeFormatter(),
  figma: loadFigmaFormatter()
};

let failures = 0;
cases.forEach((input) => {
  const outputs = Object.fromEntries(
    Object.entries(formatters).map(([name, format]) => [name, format(input)])
  );
  if (outputs.web !== outputs.chrome || outputs.chrome !== outputs.figma) {
    failures += 1;
    console.error(`Mismatch for ${JSON.stringify(input)}`);
    console.error(outputs);
  }
});

if (failures) {
  process.exit(1);
}

console.log(`PASS ${cases.length} cross-surface formatting cases`);
