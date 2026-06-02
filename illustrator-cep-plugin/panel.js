(function () {
  const HISTORY_KEY = "gapgapIllustratorHistory";
  const MAX_HISTORY = 50;
  const cs = new CSInterface();

  const inputText = document.getElementById("inputText");
  const inputCount = document.getElementById("inputCount");
  const result = document.getElementById("result");
  const resultStatus = document.getElementById("resultStatus");
  const resultCount = document.getElementById("resultCount");
  const readButton = document.getElementById("readButton");
  const copyButton = document.getElementById("copyButton");
  const writeButton = document.getElementById("writeButton");
  const historyButton = document.getElementById("historyButton");
  const historyOverlay = document.getElementById("historyOverlay");
  const historyList = document.getElementById("historyList");
  const historyCount = document.getElementById("historyCount");
  const clearHistory = document.getElementById("clearHistory");
  const closeHistoryButton = document.getElementById("closeHistoryButton");

  let currentOutput = "";
  let history = loadHistory();
  let lastAutoReadText = "";
  let isManualInputDirty = false;
  let autoReadTimer = 0;

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

  function evalScript(script) {
    return new Promise((resolve) => {
      cs.evalScript(script, resolve);
    });
  }

  function jsString(value) {
    return JSON.stringify(String(value || ""));
  }

  function parseHostResult(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return { ok: false, text: "", count: 0, reason: "host-error" };
    }
  }

  function reasonLabel(reason) {
    const labels = {
      "no-document": "请先打开一个 Illustrator 文档",
      "no-text-selection": "请选择一个文本对象，或进入文本编辑状态后选择文字",
      "multiple-selection": "检测到多个文本对象，请只选择一个",
      "host-error": "Illustrator 脚本返回异常",
      "clipboard-error": "系统剪贴板写入失败",
      "empty": "没有可复制的内容"
    };
    return labels[reason] || "操作失败";
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function addHistory(input, output) {
    if (!input.trim() || !output) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      input,
      output,
      timestamp: new Date().toISOString()
    };
    history = [entry]
      .concat(history.filter((item) => item.input !== input || item.output !== output))
      .slice(0, MAX_HISTORY);
    saveHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";
    historyCount.textContent = `${history.length} 条`;
    if (!history.length) {
      historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
      return;
    }

    history.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      button.dataset.id = item.id;
      button.innerHTML = '<span class="history-text"></span><span class="history-meta"></span>';
      button.querySelector(".history-text").textContent = item.output;
      button.querySelector(".history-meta").textContent = formatDate(item.timestamp);
      historyList.appendChild(button);
    });
  }

  function renderResult(input, formatted, status) {
    setCount(inputCount, input || "");
    currentOutput = formatted ? formatted.text : "";
    result.innerHTML = formatted ? formatted.html : "";
    resultStatus.textContent = status || (formatted ? "已自动校对" : "暂无结果");
    setCount(resultCount, currentOutput);
  }

  function formatInput(status) {
    const input = inputText.value;
    if (!input.trim()) {
      renderResult(input, null, status || "暂无结果");
      return null;
    }
    const formatted = window.GapGapCore.formatAndHighlight(input);
    renderResult(input, formatted, status || "已自动校对");
    return formatted;
  }

  async function readSelection(options) {
    options = options || {};
    const payload = parseHostResult(await evalScript("gapgapGetSelectedText()"));
    if (!payload.ok) {
      if (options.silent) return;
      resultStatus.textContent = reasonLabel(payload.reason);
      return;
    }
    if (options.silent && isManualInputDirty && payload.text !== lastAutoReadText) return;
    inputText.value = payload.text || "";
    lastAutoReadText = payload.text || "";
    isManualInputDirty = false;
    formatInput("已读取所选文本");
  }

  function scheduleAutoRead(delay) {
    clearTimeout(autoReadTimer);
    autoReadTimer = setTimeout(() => {
      readSelection({ silent: true });
    }, delay || 250);
  }

  async function copyOutput() {
    if (!currentOutput && inputText.value.trim()) formatInput("已自动校对");
    if (!currentOutput) return;

    const copyLabel = copyButton.textContent;
    try {
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(currentOutput);
          copied = true;
        }
      } catch (error) {
        copied = false;
      }

      if (!copied) {
        const holder = document.createElement("textarea");
        holder.value = currentOutput;
        holder.style.position = "fixed";
        holder.style.left = "-9999px";
        document.body.appendChild(holder);
        holder.select();
        copied = document.execCommand("copy");
        document.body.removeChild(holder);
      }
      if (!copied) {
        const payload = parseHostResult(await evalScript(`gapgapCopyText(${jsString(currentOutput)})`));
        if (!payload.ok) throw new Error(payload.reason || "clipboard-error");
      }
      resultStatus.textContent = "已复制";
      copyButton.textContent = "成功";
    } catch (error) {
      resultStatus.textContent = reasonLabel(error.message || "clipboard-error");
    }
    setTimeout(() => {
      copyButton.textContent = copyLabel;
    }, 1200);
    addHistory(inputText.value, currentOutput);
  }

  async function writeSelection() {
    if (!currentOutput && inputText.value.trim()) formatInput("已自动校对");
    if (!currentOutput) return;

    const payload = parseHostResult(await evalScript(`gapgapSetSelectedText(${jsString(currentOutput)})`));
    if (!payload.ok) {
      resultStatus.textContent = reasonLabel(payload.reason);
      return;
    }
    resultStatus.textContent = "已写回 Illustrator";
    addHistory(inputText.value, currentOutput);
  }

  inputText.addEventListener("input", () => {
    isManualInputDirty = inputText.value !== lastAutoReadText;
    formatInput();
  });

  result.addEventListener("input", () => {
    currentOutput = result.innerText.replace(/\u00A0/g, " ");
    setCount(resultCount, currentOutput);
  });

  readButton.addEventListener("click", () => readSelection());
  copyButton.addEventListener("click", copyOutput);
  writeButton.addEventListener("click", writeSelection);
  window.addEventListener("focus", () => scheduleAutoRead(120));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleAutoRead(120);
  });

  historyButton.addEventListener("click", () => {
    renderHistory();
    historyOverlay.classList.add("visible");
  });

  closeHistoryButton.addEventListener("click", () => {
    historyOverlay.classList.remove("visible");
  });

  clearHistory.addEventListener("click", () => {
    if (!history.length || !window.confirm("确定清空全部历史记录？")) return;
    history = [];
    saveHistory();
  });

  historyList.addEventListener("click", (event) => {
    const item = event.target.closest(".history-item");
    if (!item) return;
    const entry = history.find((candidate) => candidate.id === item.dataset.id);
    if (!entry) return;
    inputText.value = entry.input;
    formatInput("已载入历史记录");
    historyOverlay.classList.remove("visible");
  });

  historyOverlay.addEventListener("click", (event) => {
    if (event.target === historyOverlay) historyOverlay.classList.remove("visible");
  });

  renderHistory();
  formatInput("请选择一个文本对象");
  scheduleAutoRead(350);
})();
