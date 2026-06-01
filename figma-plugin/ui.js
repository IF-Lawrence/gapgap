(function () {
  const inputText = document.getElementById("inputText");
  const inputCount = document.getElementById("inputCount");
  const result = document.getElementById("result");
  const resultStatus = document.getElementById("resultStatus");
  const resultCount = document.getElementById("resultCount");
  const selectionStatus = document.getElementById("selectionStatus");
  const loadSelectionButton = document.getElementById("loadSelectionButton");
  const copyButton = document.getElementById("copyButton");
  const applyButton = document.getElementById("applyButton");
  const autoCopy = document.getElementById("autoCopy");
  const historyButton = document.getElementById("historyButton");
  const historyOverlay = document.getElementById("historyOverlay");
  const historyList = document.getElementById("historyList");
  const historySearch = document.getElementById("historySearch");
  const historyCount = document.getElementById("historyCount");
  const clearHistory = document.getElementById("clearHistory");
  const closeHistoryButton = document.getElementById("closeHistoryButton");

  let currentOutput = "";
  let history = [];
  let historyQuery = "";
  let settings = { autoCopy: false };
  let formatTimer = 0;
  let lastInput = "";
  let lastSelectionText = "";

  function assign(target) {
    for (let index = 1; index < arguments.length; index += 1) {
      const source = arguments[index] || {};
      Object.keys(source).forEach((key) => {
        target[key] = source[key];
      });
    }
    return target;
  }

  function post(type, payload = {}) {
    parent.postMessage({ pluginMessage: assign({ type: type }, payload) }, "*");
  }

  function countText(value) {
    const words = value.match(/[a-zA-Z0-9]+|[\u4e00-\u9fa5]/g);
    return {
      chars: value.length,
      words: words ? words.length : 0
    };
  }

  function setCount(element, value) {
    const count = countText(value || "");
    element.textContent = `${count.chars} 字符 / ${count.words} 字`;
  }

  function escapeHTML(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderHighlighted(formatted) {
    if (!formatted) return "";
    let html = "";
    let cursor = 0;
    const ranges = (formatted.addedSpaces || [])
      .map((range) => assign({}, range, { className: "gapgap-added-space" }))
      .concat((formatted.warnings || []).map((range) => assign({}, range, { className: "gapgap-warning" })))
      .sort((a, b) => a.start - b.start || b.end - a.end);

    ranges.forEach((range) => {
      if (range.start < cursor) return;
      html += escapeHTML(formatted.text.slice(cursor, range.start));
      const content = range.className === "gapgap-added-space"
        ? "&nbsp;"
        : escapeHTML(formatted.text.slice(range.start, range.end));
      html += `<span class="${range.className}">${content}</span>`;
      cursor = range.end;
    });
    html += escapeHTML(formatted.text.slice(cursor));
    return html
      .replace(/ {2}/g, " &nbsp;")
      .replace(/\n/g, "<br>");
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function sourceLabel(item) {
    return item.source || "Figma";
  }

  function normalizedHistoryQuery() {
    return historyQuery.trim().toLowerCase();
  }

  function isHistoryMatch(item, query) {
    if (!query) return true;
    return [item.input, item.output, item.source]
      .some((value) => (value || "").toLowerCase().includes(query));
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (!history.length) {
      historyCount.textContent = "0 条";
      historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
      return;
    }

    const query = normalizedHistoryQuery();
    const visibleHistory = history.filter((item) => isHistoryMatch(item, query));
    historyCount.textContent = query ? `${visibleHistory.length} / ${history.length} 条` : `${history.length} 条`;

    if (!visibleHistory.length) {
      historyList.innerHTML = '<div class="history-empty">没有匹配的历史记录</div>';
      return;
    }

    visibleHistory.forEach((item) => {
      const row = document.createElement("div");
      row.className = "history-item";
      row.dataset.id = item.id;
      row.innerHTML = `
        <button class="history-load" type="button" data-action="load">
          <span class="history-text"></span>
          <span class="history-meta">
            <span class="history-source"></span>
            <span>${formatDate(item.timestamp)}</span>
          </span>
        </button>
        <button class="history-delete" type="button" data-action="delete" aria-label="删除这条历史" title="删除这条历史">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12Zm2-10h8v10H8V9Zm7.5-5-1-1h-5l-1 1H5v2h14V4h-3.5Z"></path>
          </svg>
        </button>
      `;
      row.querySelector(".history-text").textContent = item.output;
      row.querySelector(".history-source").textContent = sourceLabel(item);
      historyList.appendChild(row);
    });
  }

  function renderFormatted(formatted, status) {
    currentOutput = formatted ? formatted.text : "";
    result.innerHTML = formatted ? renderHighlighted(formatted) : "";
    resultStatus.textContent = status || (formatted ? "已自动校对" : "暂无结果");
    setCount(resultCount, currentOutput);
  }

  function scheduleFormat(status) {
    setCount(inputCount, inputText.value);
    clearTimeout(formatTimer);

    if (!inputText.value.trim()) {
      lastInput = "";
      renderFormatted(null, "暂无结果");
      return;
    }

    formatTimer = setTimeout(() => {
      lastInput = inputText.value;
      post("FORMAT_TEXT", { input: inputText.value, status });
    }, 120);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.left = "-1000px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
    return copied;
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return fallbackCopy(text);
      }
    }
    return fallbackCopy(text);
  }

  async function copyOutput(saveHistory = true) {
    if (!currentOutput) return false;
    const copied = await writeClipboard(currentOutput);
    if (!copied) {
      resultStatus.textContent = "复制失败，请手动选中结果复制";
      return false;
    }

    resultStatus.textContent = "已复制";
    if (saveHistory) {
      post("SAVE_HISTORY", {
        input: inputText.value.trim(),
        output: currentOutput,
        source: "手动校对"
      });
    }
    return true;
  }

  function updateSelectionStatus(selection) {
    const count = selection && selection.count ? selection.count : 0;
    if (count > 1) {
      selectionStatus.textContent = "请只选择一个文本图层";
      return;
    }
    selectionStatus.textContent = count === 1 ? "已选择 1 个文本图层" : "未选择文本图层";
  }

  function loadSelection(selection) {
    updateSelectionStatus(selection);
    if (selection && selection.count > 1) {
      lastSelectionText = "";
      resultStatus.textContent = "请只选择一个文本图层";
      return;
    }
    const text = selection && selection.text ? selection.text : "";
    if (text && text !== lastSelectionText) {
      lastSelectionText = text;
      inputText.value = text;
      scheduleFormat("已读取选中文本");
    } else if (!text) {
      lastSelectionText = "";
    }
  }

  inputText.addEventListener("input", () => {
    scheduleFormat("已自动校对");
  });

  result.addEventListener("input", () => {
    currentOutput = result.innerText.replace(/\u00A0/g, " ");
    setCount(resultCount, currentOutput);
  });

  loadSelectionButton.addEventListener("click", () => {
    post("LOAD_SELECTION");
  });

  autoCopy.addEventListener("change", () => {
    settings = assign({}, settings, { autoCopy: autoCopy.checked });
    post("SAVE_SETTINGS", { settings });
  });

  copyButton.addEventListener("click", async () => {
    const copied = await copyOutput();
    if (!copied) return;
    copyButton.textContent = "成功";
    copyButton.classList.add("success");
    setTimeout(() => {
      copyButton.textContent = "复制";
      copyButton.classList.remove("success");
    }, 1200);
  });

  applyButton.addEventListener("click", () => {
    if (selectionStatus.textContent === "请只选择一个文本图层") {
      resultStatus.textContent = "请只选择一个文本图层";
      return;
    }
    if (!currentOutput && inputText.value.trim()) {
      post("FORMAT_TEXT", { input: inputText.value });
      return;
    }
    post("APPLY_TO_SELECTION", { output: currentOutput });
    if (inputText.value.trim() && currentOutput) {
      post("SAVE_HISTORY", {
        input: inputText.value.trim(),
        output: currentOutput,
        source: "写回文本图层"
      });
    }
  });

  historyButton.addEventListener("click", () => {
    historyQuery = historySearch.value;
    renderHistory();
    historyOverlay.classList.add("visible");
    historySearch.focus();
  });

  closeHistoryButton.addEventListener("click", () => {
    historyOverlay.classList.remove("visible");
  });

  historyOverlay.addEventListener("click", (event) => {
    if (event.target === historyOverlay) historyOverlay.classList.remove("visible");
  });

  historySearch.addEventListener("input", () => {
    historyQuery = historySearch.value;
    renderHistory();
  });

  historyList.addEventListener("click", (event) => {
    const item = event.target.closest(".history-item");
    if (!item) return;
    const entry = history.find((candidate) => candidate.id === item.dataset.id);
    if (!entry) return;

    const action = event.target.closest("[data-action]");
    if (action && action.dataset.action === "delete") {
      post("DELETE_HISTORY", { id: entry.id });
      return;
    }

    inputText.value = entry.input;
    renderFormatted({ text: entry.output, warnings: [] }, "已载入历史记录");
    setCount(inputCount, inputText.value);
    historyOverlay.classList.remove("visible");
  });

  clearHistory.addEventListener("click", () => {
    if (!history.length) return;
    post("CLEAR_HISTORY");
  });

  window.onmessage = async (event) => {
    const message = event.data.pluginMessage;
    if (!message || !message.type) return;

    if (message.type === "INIT") {
      history = message.history || [];
      settings = assign({ autoCopy: false }, message.settings || {});
      autoCopy.checked = settings.autoCopy === true;
      renderHistory();
      if (message.selection && message.selection.text) {
        loadSelection(message.selection);
        return;
      }
      if (message.current && message.current.input) {
        inputText.value = message.current.input;
        setCount(inputCount, inputText.value);
        renderFormatted({ text: message.current.output || "", warnings: [] }, "最近一次处理");
      }
      updateSelectionStatus(message.selection);
      return;
    }

    if (message.type === "FORMATTED") {
      if (inputText.value !== lastInput) return;
      renderFormatted(message.formatted, "已自动校对");
      if (settings.autoCopy && currentOutput) {
        await copyOutput(false);
        resultStatus.textContent = "已自动校对并复制";
      }
      return;
    }

    if (message.type === "HISTORY_UPDATED") {
      history = message.history || [];
      renderHistory();
      return;
    }

    if (message.type === "SETTINGS_UPDATED") {
      settings = assign({ autoCopy: false }, message.settings || {});
      autoCopy.checked = settings.autoCopy === true;
      return;
    }

    if (message.type === "SELECTION_UPDATED") {
      loadSelection(message.selection);
      return;
    }

    if (message.type === "SELECTION_LOADED") {
      loadSelection(message.selection);
      return;
    }

    if (message.type === "APPLY_RESULT" && message.result && message.result.ok) {
      resultStatus.textContent = "已写回选中文本";
    }
  };
})();
