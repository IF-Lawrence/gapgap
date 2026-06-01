const HISTORY_KEY = "gapgapHistory";
const SETTINGS_KEY = "gapgapSettings";
const CURRENT_KEY = "gapgapCurrent";
const MAX_HISTORY = 50;

const DEFAULT_SETTINGS = {
  autoCopy: false
};

function assign(target) {
  for (let index = 1; index < arguments.length; index += 1) {
    const source = arguments[index] || {};
    Object.keys(source).forEach((key) => {
      target[key] = source[key];
    });
  }
  return target;
}

let hasUi = false;

function postToUi(message) {
  if (!hasUi) return;
  figma.ui.postMessage(message);
}

function countWords(value) {
  const matches = value.match(/[a-zA-Z0-9]+|[\u4e00-\u9fa5]/g);
  return matches ? matches.length : 0;
}

function formatText(value) {
  const SPACE = "\uE000";
  const WARN_START = "\uE001";
  const WARN_END = "\uE002";
  const cjk = "\\u3400-\\u9fff";
  const latin = "A-Za-z";
  const latinTokenTail = `${latin}0-9+#._\\-/²³`;
  const protectedTokens = [];

  const protect = (text, pattern) => text.replace(pattern, (match) => {
    const marker = `\uE100${String.fromCharCode(0xE200 + protectedTokens.length)}\uE101`;
    protectedTokens.push(match);
    return marker;
  });

  let text = value || "";
  [
    /\[[^\]\n]+\]\([^)]+\)/g,
    /`[^`\n]+`/g,
    /https?:\/\/[^\s\u3400-\u9fff，。！？；：、（）《》“”‘’]+/gi,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    /\bv\d+(?:\.\d+)+(?:[-+][A-Z0-9.-]+)?\b/gi
  ].forEach((pattern) => {
    text = protect(text, pattern);
  });

  text = text.replace(/[\uff10-\uff19]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  text = text.replace(/([！？!?]{2,}|[。，；：、]{2,})/g, (match) => {
    const normalized = match.replace(/!/g, "\uff01").replace(/\?/g, "\uff1f");
    return `${WARN_START}${normalized}${WARN_END}`;
  });

  const punctMap = {
    ",": "\uff0c",
    "!": "\uff01",
    "?": "\uff1f",
    ";": "\uff1b",
    ":": "\uff1a",
    "(": "\uff08",
    ")": "\uff09"
  };

  Object.entries(punctMap).forEach(([half, full]) => {
    const escaped = half.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`([${cjk}])(${escaped})`, "g"), `$1${full}`);
    text = text.replace(new RegExp(`(${escaped})([${cjk}])`, "g"), `${full}$2`);
  });

  text = text.replace(new RegExp(`([${cjk}])\\.`, "g"), "$1\u3002");
  text = text.replace(new RegExp(`(?<![${latin}0-9])\\.([${cjk}])`, "g"), "\u3002$1");

  const addSpace = `$1${SPACE}$2`;
  const plusLeftOperand = `[${cjk}0-9]|[${latin}0-9][${latin}0-9._\\-/²³]*`;
  const plusRightOperand = `[${cjk}${latin}0-9]`;
  text = text.replace(new RegExp(`(${plusLeftOperand})([ \\t]*)\\+([ \\t]*)(${plusRightOperand})`, "g"), (match, left, leftSpace, rightSpace, right) => {
    if (/^[A-Za-z]$/.test(left) && new RegExp(`[${cjk}]`).test(right)) return match;
    const beforePlus = leftSpace ? " " : SPACE;
    const afterPlus = rightSpace ? " " : SPACE;
    return `${left}${beforePlus}+${afterPlus}${right}`;
  });
  text = text.replace(new RegExp(`([${cjk}])([${latin}0-9])`, "g"), addSpace);
  text = text.replace(new RegExp(`([${latin}0-9+#])([${cjk}])`, "g"), addSpace);
  text = text.replace(new RegExp(`([${cjk}])([.][${latin}])`, "g"), addSpace);
  text = text.replace(new RegExp(`([${latin}0-9][${latinTokenTail}]*)([${cjk}])`, "g"), addSpace);
  text = text.replace(new RegExp(`([${latin}0-9][${latinTokenTail}]*\\.)([${cjk}])`, "g"), addSpace);
  text = text.replace(new RegExp(`([${cjk}])([“‘「『])([${latin}0-9])`, "g"), `$1${SPACE}$2$3`);
  text = text.replace(new RegExp(`([${latin}0-9])([”’」』])([${cjk}])`, "g"), `$1$2${SPACE}$3`);
  text = text.replace(new RegExp(`([${cjk}])([—-])([${latin}0-9])`, "g"), `$1${SPACE}$2$3`);
  text = text.replace(new RegExp(`([${latin}0-9])([—-])([${cjk}])`, "g"), `$1$2${SPACE}$3`);
  text = text.replace(new RegExp(`([%‰℃℉°])([${cjk}])`, "g"), addSpace);
  text = text.replace(new RegExp(`([${cjk}])(\uE100[\uE200-\uE2ff]\uE101)`, "g"), `$1${SPACE}$2`);
  text = text.replace(new RegExp(`(\uE100[\uE200-\uE2ff]\uE101)([${cjk}])`, "g"), `$1${SPACE}$2`);
  text = text.replace(/\uE100([\uE200-\uE2ff])\uE101/g, (_, code) => protectedTokens[code.charCodeAt(0) - 0xE200]);

  let plain = "";
  const addedSpaces = [];
  const warnings = [];
  let warningStart = -1;

  for (const char of text) {
    if (char === SPACE) {
      addedSpaces.push({ start: plain.length, end: plain.length + 1 });
      plain += " ";
    } else if (char === WARN_START) {
      warningStart = plain.length;
    } else if (char === WARN_END) {
      if (warningStart >= 0) warnings.push({ start: warningStart, end: plain.length });
      warningStart = -1;
    } else {
      plain += char;
    }
  }

  return {
    text: plain,
    addedSpaces,
    warnings,
    inputLength: value.length,
    outputLength: plain.length,
    inputWords: countWords(value),
    outputWords: countWords(plain)
  };
}

async function getData() {
  const [history, settings, current] = await Promise.all([
    figma.clientStorage.getAsync(HISTORY_KEY),
    figma.clientStorage.getAsync(SETTINGS_KEY),
    figma.clientStorage.getAsync(CURRENT_KEY)
  ]);

  return {
    history: Array.isArray(history) ? history : [],
    settings: assign({}, DEFAULT_SETTINGS, settings || {}),
    current: current || null
  };
}

async function setHistory(history) {
  await figma.clientStorage.setAsync(HISTORY_KEY, history);
  return history;
}

async function setCurrent(current) {
  await figma.clientStorage.setAsync(CURRENT_KEY, current);
  return current;
}

async function addHistory(entry) {
  const history = await figma.clientStorage.getAsync(HISTORY_KEY) || [];
  const nextEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    input: entry.input,
    output: entry.output,
    source: entry.source || "Figma",
    timestamp: new Date().toISOString()
  };
  const nextHistory = [nextEntry]
    .concat(history.filter((item) => item.output !== nextEntry.output || item.input !== nextEntry.input))
    .slice(0, MAX_HISTORY);
  await figma.clientStorage.setAsync(HISTORY_KEY, nextHistory);
  await setCurrent(nextEntry);
  return nextHistory;
}

function selectedTextNodes() {
  return figma.currentPage.selection.filter((node) => node.type === "TEXT");
}

function selectedText() {
  const nodes = selectedTextNodes();
  return nodes.length === 1 ? nodes[0].characters : "";
}

function selectionPayload() {
  const nodes = selectedTextNodes();
  return {
    text: nodes.length === 1 ? nodes[0].characters : "",
    count: nodes.length,
    supported: nodes.length === 1
  };
}

async function applyToSelection(text) {
  const nodes = selectedTextNodes();
  if (nodes.length !== 1) {
    figma.notify(nodes.length ? "请只选择一个文本图层" : "请选择一个文本图层");
    return { ok: false, reason: "no-selection" };
  }

  const node = nodes[0];
  await loadTextNodeFonts(node);
  node.characters = text;

  figma.notify("已写回文本图层");
  return { ok: true };
}

async function loadTextNodeFonts(node) {
  if (node.characters.length === 0) {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    return;
  }

  if (typeof node.getRangeAllFontNames === "function") {
    const fonts = node.getRangeAllFontNames(0, node.characters.length);
    await Promise.all(fonts.map((font) => figma.loadFontAsync(font)));
    return;
  }

  if (node.fontName !== figma.mixed) {
    await figma.loadFontAsync(node.fontName);
  }
}

async function sendInitialData() {
  const data = await getData();
  postToUi(assign({
    type: "INIT",
    selection: selectionPayload()
  }, data));
}

async function openUi() {
  figma.showUI(__html__, { width: 420, height: 640, themeColors: true });
  hasUi = true;
  await sendInitialData();
}

async function formatSelectionCommand() {
  const input = selectedText();
  if (!input.trim()) {
    figma.notify("请选择包含文字的文本图层");
    return;
  }

  const formatted = formatText(input);
  await applyToSelection(formatted.text);
  const history = await addHistory({ input, output: formatted.text, source: "选中文本图层" });
  postToUi({ type: "HISTORY_UPDATED", history });
}

figma.on("selectionchange", () => {
  postToUi({
    type: "SELECTION_UPDATED",
    selection: selectionPayload()
  });
});

figma.ui.onmessage = async (message) => {
  if (!message || !message.type) return;

  if (message.type === "FORMAT_TEXT") {
    const formatted = formatText(message.input || "");
    await setCurrent({ input: message.input || "", output: formatted.text, timestamp: new Date().toISOString() });
    postToUi({ type: "FORMATTED", formatted });
    return;
  }

  if (message.type === "SAVE_HISTORY") {
    const history = await addHistory({
      input: message.input || "",
      output: message.output || "",
      source: message.source || "手动校对"
    });
    postToUi({ type: "HISTORY_UPDATED", history });
    return;
  }

  if (message.type === "DELETE_HISTORY") {
    const data = await getData();
    const history = await setHistory(data.history.filter((item) => item.id !== message.id));
    postToUi({ type: "HISTORY_UPDATED", history });
    return;
  }

  if (message.type === "CLEAR_HISTORY") {
    await setHistory([]);
    postToUi({ type: "HISTORY_UPDATED", history: [] });
    return;
  }

  if (message.type === "SAVE_SETTINGS") {
    const settings = assign({}, DEFAULT_SETTINGS, message.settings || {});
    await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
    postToUi({ type: "SETTINGS_UPDATED", settings });
    return;
  }

  if (message.type === "LOAD_SELECTION") {
    postToUi({
      type: "SELECTION_LOADED",
      selection: selectionPayload()
    });
    return;
  }

  if (message.type === "APPLY_TO_SELECTION") {
    const result = await applyToSelection(message.output || "");
    postToUi({ type: "APPLY_RESULT", result });
    return;
  }

  if (message.type === "RESIZE") {
    figma.ui.resize(Math.max(360, message.width || 420), Math.max(480, message.height || 640));
    return;
  }

  if (message.type === "CLOSE") {
    figma.closePlugin();
  }
};

if (figma.command === "format-selection") {
  formatSelectionCommand().then(() => figma.closePlugin());
} else {
  openUi();
}
