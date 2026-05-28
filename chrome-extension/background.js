chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "GAPGAP_OPEN_SIDE_PANEL") return false;

  const tabId = sender.tab && sender.tab.id;
  const windowId = sender.tab && sender.tab.windowId;

  (async () => {
    if (typeof tabId === "number") {
      await chrome.sidePanel.setOptions({
        tabId,
        path: "editor.html",
        enabled: true
      });
      await chrome.sidePanel.open({ tabId });
    } else if (typeof windowId === "number") {
      await chrome.sidePanel.open({ windowId });
    } else {
      throw new Error("No tab or window context for side panel.");
    }
  })()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
