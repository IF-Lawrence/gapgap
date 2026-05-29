(function () {
  const inputArea = document.getElementById("input-area");
  const outputArea = document.getElementById("output-area");
  const copyButton = document.getElementById("copyButton");
  const toggleHighlightBtn = document.getElementById("toggleHighlightBtn");
  const openHistoryBtn = document.getElementById("openHistoryBtn");
  const closeHistoryBtn = document.getElementById("close-history-btn");
  const historyModal = document.getElementById("history-modal");
  const historyContainer = document.getElementById("history-items-container");
  const inputStatus = document.getElementById("input-status");
  const outputStatus = document.getElementById("output-status");
  const autoCopy = document.getElementById("autoCopy");

  let history = [];
  let currentOutput = "";
  let isHighlightVisible = true;

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

  function setStatus(element, value) {
    const count = countText(value);
    element.textContent = `${count.chars} 字符 / ${count.words} 字`;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function renderHistory() {
    historyContainer.innerHTML = "";
    if (!history.length) {
      historyContainer.innerHTML = '<p class="empty-history-placeholder">这里空空如也。</p>';
      return;
    }

    history.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      button.dataset.id = item.id;
      button.innerHTML = `
        <div class="history-content"></div>
        <div class="history-date">${formatDate(item.timestamp)}</div>
      `;
      button.querySelector(".history-content").textContent = item.output;
      historyContainer.appendChild(button);
    });
  }

  function render(input, status) {
    const formatted = window.GapGapCore.formatAndHighlight(input);
    currentOutput = formatted.text;
    outputArea.innerHTML = formatted.html;
    setStatus(inputStatus, input);
    setStatus(outputStatus, currentOutput);
    if (status) outputStatus.textContent = `${outputStatus.textContent} · ${status}`;
  }

  async function handleInput() {
    const input = inputArea.value;
    render(input);
    await window.GapGapCore.saveCurrent({
      input,
      output: currentOutput,
      timestamp: new Date().toISOString()
    });
  }

  async function copyCurrent() {
    if (!currentOutput) return;
    await navigator.clipboard.writeText(currentOutput);
    await window.GapGapCore.addHistory({
      input: inputArea.value,
      output: currentOutput
    });
    const data = await getStorage([window.GapGapCore.HISTORY_KEY]);
    history = data[window.GapGapCore.HISTORY_KEY] || [];
    renderHistory();
    copyButton.textContent = "成功!";
    copyButton.classList.add("success");
    setTimeout(() => {
      copyButton.textContent = "复制";
      copyButton.classList.remove("success");
    }, 1200);
  }

  function toggleHistoryModal(show) {
    if (show) renderHistory();
    historyModal.classList.toggle("visible", show);
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
    inputArea.value = current && current.input ? current.input : "";
    render(inputArea.value);
    renderHistory();
  }

  inputArea.addEventListener("input", handleInput);

  outputArea.addEventListener("input", () => {
    currentOutput = outputArea.innerText.replace(/\u00A0/g, " ");
    setStatus(outputStatus, currentOutput);
  });

  copyButton.addEventListener("click", copyCurrent);

  toggleHighlightBtn.addEventListener("click", () => {
    isHighlightVisible = !isHighlightVisible;
    outputArea.classList.toggle("hide-highlight", !isHighlightVisible);
    toggleHighlightBtn.textContent = isHighlightVisible ? "隐藏高亮" : "显示高亮";
  });

  autoCopy.addEventListener("change", async () => {
    const settings = await window.GapGapCore.getSettings();
    await window.GapGapCore.saveSettings({ ...settings, sidePanelAutoCopy: autoCopy.checked });
  });

  openHistoryBtn.addEventListener("click", () => toggleHistoryModal(true));
  closeHistoryBtn.addEventListener("click", () => toggleHistoryModal(false));
  historyModal.addEventListener("click", (event) => {
    if (event.target === historyModal) toggleHistoryModal(false);
  });

  historyContainer.addEventListener("click", (event) => {
    const item = event.target.closest(".history-item");
    if (!item) return;
    const entry = history.find((candidate) => candidate.id === item.dataset.id);
    if (!entry) return;
    inputArea.value = entry.input;
    render(entry.input, "已载入历史");
    toggleHistoryModal(false);
  });

  load();
})();
