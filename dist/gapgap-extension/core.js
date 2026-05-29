(function () {
  const HISTORY_KEY = "gapgapHistory";
  const SETTINGS_KEY = "gapgapSettings";
  const CURRENT_KEY = "gapgapCurrent";
  const MAX_HISTORY = 50;

  function escapeHTML(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function countWords(value) {
    const matches = value.match(/[a-zA-Z0-9]+|[\u4e00-\u9fa5]/g);
    return matches ? matches.length : 0;
  }

  function formatAndHighlight(value) {
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

    let html = "";
    let plain = "";
    const stack = [];
    for (const char of text) {
      if (char === SPACE) {
        html += '<span class="gapgap-added-space">&nbsp;</span>';
        plain += " ";
      } else if (char === WARN_START) {
        stack.push("warning");
        html += '<span class="gapgap-warning">';
      } else if (char === WARN_END) {
        if (stack.pop() === "warning") html += "</span>";
      } else {
        html += escapeHTML(char);
        plain += char;
      }
    }

    return {
      html: html.replace(/\n/g, "<br>"),
      text: plain,
      inputLength: value.length,
      outputLength: plain.length,
      inputWords: countWords(value),
      outputWords: countWords(plain)
    };
  }

  function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function setStorage(items) {
    return new Promise((resolve) => chrome.storage.local.set(items, resolve));
  }

  async function getSettings() {
    const result = await getStorage([SETTINGS_KEY]);
    const saved = result[SETTINGS_KEY] || {};
    const legacyAutoCopy = saved.autoCopy === true;
    return {
      autoCopy: false,
      bubbleEnabled: true,
      popupAutoCopy: legacyAutoCopy,
      sidePanelAutoCopy: legacyAutoCopy,
      ...saved
    };
  }

  async function saveSettings(settings) {
    await setStorage({ [SETTINGS_KEY]: settings });
    return settings;
  }

  async function saveCurrent(entry) {
    await setStorage({ [CURRENT_KEY]: entry });
    return entry;
  }

  async function addHistory(entry) {
    const result = await getStorage([HISTORY_KEY]);
    const history = result[HISTORY_KEY] || [];
    const nextEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      input: entry.input,
      output: entry.output,
      url: entry.url || "",
      title: entry.title || "",
      timestamp: new Date().toISOString()
    };

    const nextHistory = [
      nextEntry,
      ...history.filter((item) => item.output !== nextEntry.output || item.input !== nextEntry.input)
    ].slice(0, MAX_HISTORY);

    await setStorage({
      [CURRENT_KEY]: nextEntry,
      [HISTORY_KEY]: nextHistory
    });

    return {
      current: nextEntry,
      history: nextHistory
    };
  }

  async function clearHistory() {
    await setStorage({ [HISTORY_KEY]: [] });
  }

  window.GapGapCore = {
    HISTORY_KEY,
    SETTINGS_KEY,
    CURRENT_KEY,
    formatAndHighlight,
    getSettings,
    saveSettings,
    saveCurrent,
    addHistory,
    clearHistory
  };
})();
