(function () {
  const inputText = document.getElementById("inputText");
  const result = document.getElementById("result");
  const resultStatus = document.getElementById("resultStatus");
  const resultCount = document.getElementById("resultCount");
  const checkButton = document.getElementById("checkButton");
  const copyButton = document.getElementById("copyButton");
  const openSidePanelButton = document.getElementById("openSidePanelButton");
  const autoCopy = document.getElementById("autoCopy");
  const historyList = document.getElementById("historyList");
  const clearHistory = document.getElementById("clearHistory");

  let currentOutput = "";
  let history = [];

  function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function renderResult(input, formatted, status) {
    inputText.value = input || "";
    currentOutput = formatted ? formatted.text : "";
    result.innerHTML = formatted ? formatted.html : "";
    resultStatus.textContent = status || "已处理";
    resultCount.textContent = formatted
      ? `${formatted.outputLength} 字符 / ${formatted.outputWords} 字`
      : "0 字符 / 0 字";
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (!history.length) {
      historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
      return;
    }

    history.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      button.dataset.id = item.id;
      button.innerHTML = `
        <span class="history-text"></span>
        <span class="history-date">${formatDate(item.timestamp)}</span>
        <span class="history-source"></span>
      `;
      button.querySelector(".history-text").textContent = item.output;
      button.querySelector(".history-source").textContent = item.title || item.url || "手动检测";
      historyList.appendChild(button);
    });
  }

  async function copyOutput(text) {
    await navigator.clipboard.writeText(text);
  }

  async function runCheck() {
    const input = inputText.value.trim();
    if (!input) {
      renderResult("", null, "请输入要检测的内容");
      return;
    }

    const formatted = window.GapGapCore.formatAndHighlight(input);
    const settings = await window.GapGapCore.getSettings();
    let status = "已处理";

    if (settings.sidePanelAutoCopy) {
      await copyOutput(formatted.text);
      status = "已处理并复制";
    }

    const saved = await window.GapGapCore.addHistory({
      input,
      output: formatted.text
    });
    history = saved.history;
    renderResult(input, formatted, status);
    renderHistory();
  }

  async function load() {
    const data = await getStorage([
      window.GapGapCore.SETTINGS_KEY,
      window.GapGapCore.CURRENT_KEY,
      window.GapGapCore.HISTORY_KEY
    ]);
    const settings = {
      popupAutoCopy: false,
      sidePanelAutoCopy: false,
      ...(data[window.GapGapCore.SETTINGS_KEY] || {})
    };
    autoCopy.checked = settings.sidePanelAutoCopy;
    history = data[window.GapGapCore.HISTORY_KEY] || [];

    const current = data[window.GapGapCore.CURRENT_KEY];
    if (current) {
      renderResult(current.input, window.GapGapCore.formatAndHighlight(current.input), "最近一次处理");
    }
    renderHistory();
  }

  autoCopy.addEventListener("change", async () => {
    const settings = await window.GapGapCore.getSettings();
    await window.GapGapCore.saveSettings({ ...settings, sidePanelAutoCopy: autoCopy.checked });
  });

  checkButton.addEventListener("click", runCheck);

  inputText.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      runCheck();
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!currentOutput) return;
    await copyOutput(currentOutput);
    resultStatus.textContent = "已复制";
  });

  openSidePanelButton.addEventListener("click", async () => {
    const current = {
      input: inputText.value,
      output: currentOutput,
      timestamp: new Date().toISOString()
    };
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab && typeof tab.id === "number") {
      await chrome.sidePanel.open({ tabId: tab.id });
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: "sidepanel.html",
        enabled: true
      });
      await window.GapGapCore.saveCurrent(current);
    }
  });

  historyList.addEventListener("click", (event) => {
    const item = event.target.closest(".history-item");
    if (!item) return;
    const entry = history.find((candidate) => candidate.id === item.dataset.id);
    if (!entry) return;
    renderResult(entry.input, window.GapGapCore.formatAndHighlight(entry.input), "已载入历史记录");
  });

  clearHistory.addEventListener("click", async () => {
    await window.GapGapCore.clearHistory();
    history = [];
    renderHistory();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[window.GapGapCore.HISTORY_KEY]) {
      history = changes[window.GapGapCore.HISTORY_KEY].newValue || [];
      renderHistory();
    }
    if (changes[window.GapGapCore.CURRENT_KEY]) {
      const current = changes[window.GapGapCore.CURRENT_KEY].newValue;
      if (current) {
        renderResult(current.input, window.GapGapCore.formatAndHighlight(current.input), "最近一次处理");
      }
    }
  });

  load();
})();
