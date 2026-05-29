(function () {
  const inputText = document.getElementById("inputText");
  const inputCount = document.getElementById("inputCount");
  const result = document.getElementById("result");
  const resultStatus = document.getElementById("resultStatus");
  const resultCount = document.getElementById("resultCount");
  const copyButton = document.getElementById("copyButton");
  const autoCopy = document.getElementById("autoCopy");
  const bubbleEnabled = document.getElementById("bubbleEnabled");
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
  let saveTimer = 0;
  let historyTimer = 0;
  let settings = { bubbleEnabled: true, popupAutoCopy: false, sidePanelAutoCopy: false };

  function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function countText(value) {
    const words = value.match(/[a-zA-Z0-9]+|[\u4e00-\u9fa5]/g);
    return {
      chars: value.length,
      words: words ? words.length : 0
    };
  }

  function setCount(element, value) {
    const count = countText(value);
    element.textContent = `${count.chars} 字符 / ${count.words} 字`;
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
    if (item.title) return item.title;
    if (!item.url) return "手动检测";

    try {
      return new URL(item.url).hostname;
    } catch (error) {
      return item.url;
    }
  }

  function normalizedHistoryQuery() {
    return historyQuery.trim().toLowerCase();
  }

  function isHistoryMatch(item, query) {
    if (!query) return true;
    return [
      item.input,
      item.output,
      item.title,
      item.url,
      sourceLabel(item)
    ].some((value) => (value || "").toLowerCase().includes(query));
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
    historyCount.textContent = query
      ? `${visibleHistory.length} / ${history.length} 条`
      : `${history.length} 条`;

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

  async function persistHistory(nextHistory) {
    history = nextHistory;
    await chrome.storage.local.set({ [window.GapGapCore.HISTORY_KEY]: history });
    renderHistory();
  }

  function renderResult(input, formatted, status, syncInput) {
    if (syncInput) inputText.value = input || "";
    setCount(inputCount, input || "");
    currentOutput = formatted ? formatted.text : "";
    result.innerHTML = formatted ? formatted.html : "";
    resultStatus.textContent = status || (formatted ? "已自动校对" : "暂无结果");
    setCount(resultCount, currentOutput);
  }

  function renderFromInput(status) {
    const input = inputText.value;
    if (!input.trim()) {
      renderResult(input, null, status || "暂无结果", false);
      return null;
    }

    const formatted = window.GapGapCore.formatAndHighlight(input);
    renderResult(input, formatted, status || "已自动校对", false);
    return formatted;
  }

  function syncInputAndRender(input, status) {
    inputText.value = input || "";
    renderFromInput(status);
  }

  async function copyOutput(text) {
    await navigator.clipboard.writeText(text);
  }

  function scheduleSaveCurrent() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      window.GapGapCore.saveCurrent({
        input: inputText.value,
        output: currentOutput,
        timestamp: new Date().toISOString()
      });
    }, 250);
  }

  async function saveHistorySoon() {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(async () => {
      const input = inputText.value.trim();
      if (!input || !currentOutput) return;

      const saved = await window.GapGapCore.addHistory({
        input,
        output: currentOutput
      });
      history = saved.history;
      renderHistory();
    }, 450);
  }

  async function autoFormat(options = {}) {
    const input = inputText.value.trim();
    if (!input) {
      renderFromInput("暂无结果");
      scheduleSaveCurrent();
      return;
    }

    const formatted = renderFromInput(options.status || "已自动校对");

    if (options.copy || settings.sidePanelAutoCopy) {
      try {
        await copyOutput(formatted.text);
        resultStatus.textContent = "已自动校对并复制";
      } catch (error) {
        resultStatus.textContent = "已自动校对，复制失败";
      }
    }

    scheduleSaveCurrent();
    if (options.saveHistory) await saveHistorySoon();
  }

  async function load() {
    const data = await getStorage([
      window.GapGapCore.SETTINGS_KEY,
      window.GapGapCore.CURRENT_KEY,
      window.GapGapCore.HISTORY_KEY
    ]);
    settings = {
      bubbleEnabled: true,
      popupAutoCopy: false,
      sidePanelAutoCopy: false,
      ...(data[window.GapGapCore.SETTINGS_KEY] || {})
    };
    const current = data[window.GapGapCore.CURRENT_KEY];

    autoCopy.checked = settings.sidePanelAutoCopy;
    bubbleEnabled.checked = settings.bubbleEnabled !== false;
    history = data[window.GapGapCore.HISTORY_KEY] || [];

    if (current && current.input) {
      syncInputAndRender(current.input, "最近一次处理");
    } else {
      syncInputAndRender("", "暂无结果");
    }
    renderHistory();
  }

  inputText.addEventListener("input", () => {
    autoFormat();
  });

  inputText.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      copyButton.click();
    }
  });

  result.addEventListener("input", () => {
    currentOutput = result.innerText.replace(/\u00A0/g, " ");
    setCount(resultCount, currentOutput);
    scheduleSaveCurrent();
  });

  autoCopy.addEventListener("change", async () => {
    settings = { ...settings, sidePanelAutoCopy: autoCopy.checked };
    await window.GapGapCore.saveSettings(settings);
  });

  bubbleEnabled.addEventListener("change", async () => {
    settings = { ...settings, bubbleEnabled: bubbleEnabled.checked };
    await window.GapGapCore.saveSettings(settings);
  });

  copyButton.addEventListener("click", async () => {
    const copyLabel = copyButton.querySelector("span");
    if (!currentOutput && inputText.value.trim()) renderFromInput("已自动校对");
    if (!currentOutput) return;
    await copyOutput(currentOutput);
    resultStatus.textContent = "已复制";
    copyLabel.textContent = "成功";
    copyButton.classList.add("success");
    setTimeout(() => {
      copyLabel.textContent = "复制";
      copyButton.classList.remove("success");
    }, 1200);
    await saveHistorySoon();
  });

  historyList.addEventListener("click", (event) => {
    const item = event.target.closest(".history-item");
    if (!item) return;
    const entry = history.find((candidate) => candidate.id === item.dataset.id);
    if (!entry) return;

    const action = event.target.closest("[data-action]");
    if (action && action.dataset.action === "delete") {
      persistHistory(history.filter((candidate) => candidate.id !== entry.id));
      return;
    }

    syncInputAndRender(entry.input, "已载入历史记录");
    scheduleSaveCurrent();
    historyOverlay.classList.remove("visible");
  });

  historySearch.addEventListener("input", () => {
    historyQuery = historySearch.value;
    renderHistory();
  });

  clearHistory.addEventListener("click", async () => {
    if (!history.length) return;
    if (!window.confirm("确定清空全部历史记录？")) return;
    await window.GapGapCore.clearHistory();
    history = [];
    renderHistory();
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

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[window.GapGapCore.HISTORY_KEY]) {
      history = changes[window.GapGapCore.HISTORY_KEY].newValue || [];
      renderHistory();
    }
    if (changes[window.GapGapCore.CURRENT_KEY]) {
      const current = changes[window.GapGapCore.CURRENT_KEY].newValue;
      if (current && current.input !== inputText.value) {
        syncInputAndRender(current.input, "最近一次处理");
      }
    }
    if (changes[window.GapGapCore.SETTINGS_KEY]) {
      settings = {
        bubbleEnabled: true,
        popupAutoCopy: false,
        sidePanelAutoCopy: false,
        ...(changes[window.GapGapCore.SETTINGS_KEY].newValue || {})
      };
      autoCopy.checked = settings.sidePanelAutoCopy === true;
      bubbleEnabled.checked = settings.bubbleEnabled !== false;
    }
  });

  load();
})();
