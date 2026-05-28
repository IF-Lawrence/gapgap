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
  bubble.textContent = "G";

  const panel = document.createElement("section");
  panel.className = "gapgap-result-panel";
  panel.innerHTML = `
    <div class="gapgap-result-header">
      <div class="gapgap-brand">
        <span class="gapgap-brand-dot"></span>
        <span>
          <strong>GapGap</strong>
          <small>校对结果</small>
        </span>
      </div>
      <div class="gapgap-header-actions">
        <button class="gapgap-icon-button" type="button" data-action="sidePanel" aria-label="打开侧边栏" title="打开侧边栏">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7"></path><path d="M21 3 10 14"></path><path d="M11 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"></path></svg>
        </button>
        <button class="gapgap-icon-button gapgap-result-close" type="button" aria-label="关闭" title="关闭">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
      </div>
    </div>
    <div class="gapgap-result-card">
      <div class="gapgap-result-body"></div>
    </div>
    <div class="gapgap-result-footer">
      <div class="gapgap-result-status">等待检测</div>
      <button class="gapgap-copy-button" type="button" data-action="copy">
        <span>复制结果</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h10v14H8z"></path><path d="M5 3h10v4H8v10H5z"></path></svg>
      </button>
    </div>
  `;

  document.documentElement.append(bubble, panel);

  const resultBody = panel.querySelector(".gapgap-result-body");
  const resultStatus = panel.querySelector(".gapgap-result-status");
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
    const top = Math.max(8, rect.top - 38);
    const left = Math.min(window.innerWidth - 42, Math.max(8, rect.left + rect.width / 2 - 15));
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

  async function showPanel(input, result, copied) {
    latestInput = input;
    latestResult = result;
    resultBody.innerHTML = result.html || "<span>无可处理内容</span>";
    resultStatus.textContent = copied ? "已复制到剪切板" : "已自动校对";
    panel.style.display = "flex";
    await loadPanelPosition();
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }

  function currentEntry(input, result) {
    return {
      input,
      output: result ? result.text : "",
      url: location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    };
  }

  function openNativeSidePanel(entry, onFailure) {
    chrome.runtime.sendMessage({
      type: "GAPGAP_OPEN_SIDE_PANEL",
      current: entry
    }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) {
        if (onFailure) onFailure(chrome.runtime.lastError ? chrome.runtime.lastError.message : response && response.error);
      }
    });
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
    }
  });

  document.addEventListener("scroll", hideBubble, true);
  window.addEventListener("resize", hideBubble);

  bubble.addEventListener("mousedown", (event) => event.preventDefault());
  bubble.addEventListener("click", runCheck);

  panel.querySelector(".gapgap-result-close").addEventListener("click", () => {
    panel.style.display = "none";
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
      resultStatus.textContent = "已复制";
    }
    if (action === "sidePanel") {
      openNativeSidePanel(currentEntry(latestInput, latestResult), (error) => {
        resultStatus.textContent = error ? `无法打开 Chrome 侧边栏：${error}` : "无法打开 Chrome 侧边栏";
      });
    }
  });
})();
