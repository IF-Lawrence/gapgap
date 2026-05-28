(function () {
  if (window.__gapgapContentLoaded) return;
  window.__gapgapContentLoaded = true;

  let selectedText = "";
  let latestResult = null;
  let latestInput = "";
  let panelDrag = null;

  const bubble = document.createElement("button");
  bubble.className = "gapgap-bubble";
  bubble.type = "button";
  bubble.textContent = "GapGap 检测";

  const panel = document.createElement("section");
  panel.className = "gapgap-result-panel";
  panel.innerHTML = `
    <div class="gapgap-result-header">
      <div class="gapgap-brand">
        <span class="gapgap-brand-dot"></span>
        <span>GapGap</span>
      </div>
      <div class="gapgap-header-actions">
        <button class="gapgap-icon-button" type="button" data-action="copy" aria-label="复制结果" title="复制结果">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h10v14H8z"></path><path d="M5 3h10v4H8v10H5z"></path></svg>
        </button>
        <button class="gapgap-icon-button" type="button" data-action="sidePanel" aria-label="打开侧边栏" title="打开侧边栏">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7"></path><path d="M21 3 10 14"></path><path d="M11 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"></path></svg>
        </button>
        <button class="gapgap-icon-button" type="button" data-action="history" aria-label="历史记录" title="历史记录">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path><path d="M12 7v6l4 2"></path></svg>
        </button>
        <button class="gapgap-icon-button gapgap-result-close" type="button" aria-label="关闭" title="关闭">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
      </div>
    </div>
    <div class="gapgap-result-card">
      <div class="gapgap-result-body"></div>
    </div>
    <div class="gapgap-result-status">等待检测</div>
    <aside class="gapgap-history-popover" aria-label="历史记录">
      <div class="gapgap-history-list"></div>
    </aside>
  `;

  document.documentElement.append(bubble, panel);

  const resultBody = panel.querySelector(".gapgap-result-body");
  const resultStatus = panel.querySelector(".gapgap-result-status");
  const historyList = panel.querySelector(".gapgap-history-list");
  const panelHeader = panel.querySelector(".gapgap-result-header");

  function getSelectionText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : "";
  }

  function selectionRect() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width || rect.height) return rect;
    const rects = range.getClientRects();
    return rects.length ? rects[0] : null;
  }

  function hideBubble() {
    bubble.style.display = "none";
  }

  function showBubble(rect) {
    const top = Math.max(8, rect.top - 44);
    const left = Math.min(window.innerWidth - 130, Math.max(8, rect.left + rect.width / 2 - 56));
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
    bubble.style.display = "inline-flex";
  }

  async function loadPanelPosition() {
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(["gapgapPanelPosition"], resolve);
    });
    const position = data.gapgapPanelPosition;
    if (!position) return;

    const maxLeft = window.innerWidth - panel.offsetWidth - 8;
    const maxTop = window.innerHeight - panel.offsetHeight - 8;
    const left = Math.min(Math.max(8, position.left), Math.max(8, maxLeft));
    const top = Math.min(Math.max(8, position.top), Math.max(8, maxTop));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function savePanelPosition() {
    const rect = panel.getBoundingClientRect();
    chrome.storage.local.set({
      gapgapPanelPosition: {
        left: rect.left,
        top: rect.top
      }
    });
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function renderHistory(history) {
    historyList.innerHTML = "";
    if (!history.length) {
      historyList.innerHTML = '<div class="gapgap-history-empty">暂无历史记录</div>';
      return;
    }

    history.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gapgap-history-item";
      button.dataset.input = item.input;
      button.innerHTML = `
        <span class="gapgap-history-text"></span>
        <span class="gapgap-history-date">${formatDate(item.timestamp)}</span>
      `;
      button.querySelector(".gapgap-history-text").textContent = item.output;
      historyList.appendChild(button);
    });
  }

  async function refreshHistory() {
    const data = await new Promise((resolve) => {
      chrome.storage.local.get([window.GapGapCore.HISTORY_KEY], resolve);
    });
    renderHistory(data[window.GapGapCore.HISTORY_KEY] || []);
  }

  async function showPanel(input, result, copied) {
    latestInput = input;
    latestResult = result;
    resultBody.innerHTML = result.html || "<span>无可处理内容</span>";
    resultStatus.textContent = copied ? "已处理并复制到剪切板" : "已处理";
    panel.style.display = "flex";
    await loadPanelPosition();
    await refreshHistory();
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }

  async function runCheck() {
    const input = selectedText || getSelectionText();
    if (!input) return;

    const result = window.GapGapCore.formatAndHighlight(input);
    const settings = await window.GapGapCore.getSettings();
    let copied = false;

    if (settings.autoCopy) {
      try {
        await copyText(result.text);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }

    await window.GapGapCore.addHistory({
      input,
      output: result.text,
      url: location.href,
      title: document.title
    });

    await showPanel(input, result, copied);
    hideBubble();
  }

  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      selectedText = getSelectionText();
      const rect = selectionRect();
      if (selectedText && rect) {
        showBubble(rect);
      } else {
        hideBubble();
      }
    }, 0);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideBubble();
      panel.style.display = "none";
      panel.classList.remove("gapgap-history-open");
    }
  });

  document.addEventListener("scroll", hideBubble, true);
  window.addEventListener("resize", hideBubble);

  bubble.addEventListener("mousedown", (event) => event.preventDefault());
  bubble.addEventListener("click", runCheck);

  panel.querySelector(".gapgap-result-close").addEventListener("click", () => {
    panel.style.display = "none";
    panel.classList.remove("gapgap-history-open");
  });

  panelHeader.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    const rect = panel.getBoundingClientRect();
    panelDrag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    panelHeader.setPointerCapture(event.pointerId);
    panel.classList.add("gapgap-dragging");
    event.preventDefault();
  });

  panelHeader.addEventListener("pointermove", (event) => {
    if (!panelDrag || panelDrag.pointerId !== event.pointerId) return;
    const maxLeft = window.innerWidth - panel.offsetWidth - 8;
    const maxTop = window.innerHeight - panel.offsetHeight - 8;
    const left = Math.min(Math.max(8, event.clientX - panelDrag.offsetX), Math.max(8, maxLeft));
    const top = Math.min(Math.max(8, event.clientY - panelDrag.offsetY), Math.max(8, maxTop));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });

  panelHeader.addEventListener("pointerup", (event) => {
    if (!panelDrag || panelDrag.pointerId !== event.pointerId) return;
    panelDrag = null;
    panel.classList.remove("gapgap-dragging");
    savePanelPosition();
  });

  panelHeader.addEventListener("pointercancel", () => {
    panelDrag = null;
    panel.classList.remove("gapgap-dragging");
  });

  panel.addEventListener("click", async (event) => {
    const action = event.target && event.target.dataset ? event.target.dataset.action : "";
    if (action === "copy" && latestResult) {
      await copyText(latestResult.text);
      resultStatus.textContent = "已复制到剪切板";
    }
    if (action === "history") {
      await refreshHistory();
      panel.classList.toggle("gapgap-history-open");
    }
    if (action === "sidePanel") {
      if (latestInput) {
        await window.GapGapCore.saveCurrent({
          input: latestInput,
          output: latestResult ? latestResult.text : "",
          url: location.href,
          title: document.title,
          timestamp: new Date().toISOString()
        });
      }
      chrome.runtime.sendMessage({ type: "GAPGAP_OPEN_SIDE_PANEL" }, (response) => {
        if (!response || !response.ok) {
          resultStatus.textContent = "无法打开侧边栏，请在扩展详情中确认侧边栏权限";
        }
      });
    }
  });

  historyList.addEventListener("click", (event) => {
    const item = event.target.closest(".gapgap-history-item");
    if (!item) return;
    const input = item.dataset.input || "";
    const result = window.GapGapCore.formatAndHighlight(input);
    showPanel(input, result, false);
  });
})();
