(function () {
  if (window.__gapgapContentLoaded) return;
  window.__gapgapContentLoaded = true;

  let selectedText = "";
  let latestResult = null;
  let latestInput = "";
  let panelDrag = null;
  const logoSvg = '<svg class="gapgap-logo" viewBox="0 0 103 103" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M-3.49234e-05 24.592C-3.49234e-05 20.5405 0.706632 16.96 2.11997 13.8507C3.5333 10.7414 5.41774 8.15024 7.7733 6.07736C10.0346 4.09869 12.5786 2.59113 15.4053 1.55469C18.3262 0.518243 21.2471 1.85928e-05 24.168 1.85928e-05C27.0889 1.85928e-05 29.9626 0.518243 32.7893 1.55469C35.7102 2.59113 38.3484 4.09869 40.704 6.07736C42.9653 8.15024 44.8026 10.7414 46.216 13.8507C47.6293 16.96 48.336 20.5405 48.336 24.592V29.68H33.92V24.592C33.92 21.1058 32.9306 18.5618 30.952 16.96C29.0675 15.264 26.8062 14.416 24.168 14.416C21.5297 14.416 19.2213 15.264 17.2426 16.96C15.3582 18.5618 14.416 21.1058 14.416 24.592V77.7334C14.416 81.2196 15.3582 83.8107 17.2426 85.5067C19.2213 87.1085 21.5297 87.9094 24.168 87.9094C26.8062 87.9094 29.0675 87.1085 30.952 85.5067C32.9306 83.8107 33.92 81.2196 33.92 77.7334V58.7947H22.472V46.0747H48.336V77.7334C48.336 81.9734 47.6293 85.6009 46.216 88.616C44.8026 91.6311 42.9653 94.128 40.704 96.1067C38.3484 98.1796 35.7102 99.7342 32.7893 100.771C29.9626 101.807 27.0889 102.325 24.168 102.325C21.2471 102.325 18.3262 101.807 15.4053 100.771C12.5786 99.7342 10.0346 98.1796 7.7733 96.1067C5.41774 94.128 3.5333 91.6311 2.11997 88.616C0.706632 85.6009 -3.49234e-05 81.9734 -3.49234e-05 77.7334V24.592Z" fill="black"/><rect x="54.064" y="0.477356" width="48" height="102" rx="24" fill="#EBD3F0"/></svg>';

  const bubble = document.createElement("button");
  bubble.className = "gapgap-bubble";
  bubble.type = "button";
  bubble.innerHTML = logoSvg;

  const panel = document.createElement("section");
  panel.className = "gapgap-result-panel";
  panel.innerHTML = `
    <div class="gapgap-result-header">
      <div class="gapgap-brand">
        <span class="gapgap-brand-dot">${logoSvg}</span>
        <strong>GapGap</strong>
      </div>
      <div class="gapgap-header-actions">
        <div class="gapgap-result-status">等待检测</div>
        <button class="gapgap-icon-button gapgap-result-close" type="button" aria-label="关闭" title="关闭">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18.3 5.71-1.41-1.42L12 9.17 7.11 4.29 5.7 5.71 10.59 10.6 5.7 15.49l1.41 1.41L12 12.01l4.89 4.89 1.41-1.41-4.89-4.89 4.89-4.89Z"></path></svg>
        </button>
      </div>
    </div>
    <div class="gapgap-result-card">
      <div class="gapgap-result-body"></div>
    </div>
    <div class="gapgap-result-footer">
      <div class="gapgap-footer-left">
        <label class="gapgap-auto-copy">
          <input class="gapgap-auto-copy-input" type="checkbox">
          <span></span>
          <strong>自动复制</strong>
        </label>
      </div>
      <div class="gapgap-footer-actions">
        <button class="gapgap-action-button gapgap-edit-button" type="button" data-action="sidePanel" aria-label="编辑" title="编辑">
          <span>编辑</span>
        </button>
        <button class="gapgap-action-button gapgap-copy-button" type="button" data-action="copy">
          <span>复制</span>
        </button>
      </div>
    </div>
  `;

  document.documentElement.append(bubble, panel);

  const resultBody = panel.querySelector(".gapgap-result-body");
  const resultStatus = panel.querySelector(".gapgap-result-status");
  const panelHeader = panel.querySelector(".gapgap-result-header");
  const popupAutoCopy = panel.querySelector(".gapgap-auto-copy-input");

  function getSelectionText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : "";
  }

  function selectionRect() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length) {
      const visibleRects = Array.from(rects).filter((rect) => rect.width || rect.height);
      if (visibleRects.length) return visibleRects[visibleRects.length - 1];
    }
    const rect = range.getBoundingClientRect();
    return rect.width || rect.height ? rect : null;
  }

  function hideBubble() {
    bubble.style.display = "none";
  }

  function showBubble(rect) {
    const bubbleSize = 30;
    const gap = 8;
    const preferredTop = rect.top - bubbleSize - gap;
    const top = preferredTop >= gap
      ? preferredTop
      : Math.min(window.innerHeight - bubbleSize - gap, rect.bottom + gap);
    const preferredLeft = rect.right - bubbleSize;
    const left = Math.min(
      window.innerWidth - bubbleSize - gap,
      Math.max(gap, preferredLeft)
    );
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
    bubble.style.display = "inline-flex";
  }

  async function isBubbleEnabled() {
    const settings = await window.GapGapCore.getSettings();
    return settings.bubbleEnabled !== false;
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
    const settings = await window.GapGapCore.getSettings();
    popupAutoCopy.checked = settings.popupAutoCopy;
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

    if (settings.popupAutoCopy) {
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
    setTimeout(async () => {
      selectedText = getSelectionText();
      const rect = selectionRect();
      if (selectedText && rect && await isBubbleEnabled()) {
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

  popupAutoCopy.addEventListener("change", async () => {
    const settings = await window.GapGapCore.getSettings();
    await window.GapGapCore.saveSettings({
      ...settings,
      popupAutoCopy: popupAutoCopy.checked
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[window.GapGapCore.SETTINGS_KEY]) return;
    const nextSettings = {
      bubbleEnabled: true,
      ...(changes[window.GapGapCore.SETTINGS_KEY].newValue || {})
    };
    if (nextSettings.bubbleEnabled === false) hideBubble();
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
    const actionTarget = event.target.closest("[data-action]");
    const action = actionTarget ? actionTarget.dataset.action : "";
    if (action === "copy" && latestResult) {
      await copyText(latestResult.text);
      const copyButton = event.target.closest(".gapgap-copy-button");
      const copyLabel = copyButton ? copyButton.querySelector("span") : null;
      resultStatus.textContent = "已复制";
      if (copyButton) copyButton.classList.add("success");
      if (copyLabel) copyLabel.textContent = "已复制";
      setTimeout(() => {
        panel.style.display = "none";
        if (copyButton) copyButton.classList.remove("success");
        if (copyLabel) copyLabel.textContent = "复制";
      }, 650);
    }
    if (action === "sidePanel") {
      openNativeSidePanel(currentEntry(latestInput, latestResult), (error) => {
        resultStatus.textContent = error ? `无法打开 Chrome 侧边栏：${error}` : "无法打开 Chrome 侧边栏";
      });
    }
  });
})();
