(function () {
  if (window.__gapgapContentLoaded) return;
  window.__gapgapContentLoaded = true;

  let selectedText = "";
  let latestResult = null;
  let latestInput = "";
  let panelDrag = null;
  const logoUrl = chrome.runtime.getURL("logo.png");
  const logoImage = `<img class="gapgap-logo" src="${logoUrl}" alt="" aria-hidden="true">`;

  const bubble = document.createElement("button");
  bubble.className = "gapgap-bubble";
  bubble.type = "button";
  bubble.innerHTML = logoImage;

  const panel = document.createElement("section");
  panel.className = "gapgap-result-panel";
  panel.innerHTML = `
    <div class="gapgap-result-header">
      <div class="gapgap-brand">
        <span class="gapgap-brand-dot">${logoImage}</span>
        <span class="gapgap-brand-copy">
          <strong>GapGap</strong>
          <span>No more ghost gaps</span>
        </span>
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

  function activeTextControl() {
    const element = document.activeElement;
    if (!element || element.disabled) return null;
    if (element instanceof HTMLTextAreaElement) return element;
    if (!(element instanceof HTMLInputElement)) return null;
    const textTypes = new Set(["", "email", "number", "password", "search", "tel", "text", "url"]);
    return textTypes.has(element.type) ? element : null;
  }

  function getControlSelectionText(control) {
    if (!control || typeof control.selectionStart !== "number" || typeof control.selectionEnd !== "number") return "";
    if (control.selectionStart === control.selectionEnd) return "";
    return control.value.slice(control.selectionStart, control.selectionEnd).trim();
  }

  function getSelectionText() {
    const controlText = getControlSelectionText(activeTextControl());
    if (controlText) return controlText;
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : "";
  }

  function controlSelectionRect(control) {
    if (!control || typeof control.selectionEnd !== "number") return null;
    const rect = control.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const styles = window.getComputedStyle(control);
    const mirror = document.createElement("div");
    const marker = document.createElement("span");
    const copiedProperties = [
      "boxSizing", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
      "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "fontFamily", "fontSize",
      "fontStyle", "fontVariant", "fontWeight", "letterSpacing", "lineHeight", "textTransform",
      "textIndent", "textAlign", "wordSpacing", "tabSize", "whiteSpace", "wordBreak"
    ];

    copiedProperties.forEach((property) => {
      mirror.style[property] = styles[property];
    });
    mirror.style.position = "fixed";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.top = `${rect.top - control.scrollTop}px`;
    mirror.style.left = `${rect.left - control.scrollLeft}px`;
    mirror.style.width = `${rect.width}px`;
    mirror.style.minHeight = `${rect.height}px`;
    mirror.style.overflow = "hidden";
    mirror.style.whiteSpace = control instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
    mirror.style.overflowWrap = "break-word";

    const valueBeforeSelectionEnd = control.value.slice(0, control.selectionEnd);
    mirror.append(document.createTextNode(valueBeforeSelectionEnd || "."));
    marker.textContent = "\u200b";
    mirror.append(marker);
    document.documentElement.append(mirror);

    const markerRect = marker.getBoundingClientRect();
    mirror.remove();
    if (!markerRect.width && !markerRect.height) return rect;

    const left = Math.min(Math.max(markerRect.left, rect.left), rect.right);
    const top = Math.min(Math.max(markerRect.top, rect.top), rect.bottom);
    return {
      top,
      right: left,
      bottom: top + Math.max(markerRect.height, parseFloat(styles.lineHeight) || 16),
      left,
      width: 1,
      height: Math.max(markerRect.height, parseFloat(styles.lineHeight) || 16)
    };
  }

  function selectionRect() {
    const controlRect = controlSelectionRect(activeTextControl());
    if (controlRect) return controlRect;
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
