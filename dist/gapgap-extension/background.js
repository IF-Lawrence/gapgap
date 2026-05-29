chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "GAPGAP_OPEN_SIDE_PANEL") return false;

  const tabId = sender.tab && sender.tab.id;
  const windowId = sender.tab && sender.tab.windowId;
  const current = message.current;

  (async () => {
    if (typeof tabId === "number") {
      await chrome.sidePanel.open({ tabId });
      await chrome.sidePanel.setOptions({
        tabId,
        path: "sidepanel.html",
        enabled: true
      });
    } else if (typeof windowId === "number") {
      await chrome.sidePanel.open({ windowId });
    } else {
      throw new Error("No tab or window context for side panel.");
    }

    if (current) {
      await chrome.storage.local.set({
        gapgapCurrent: {
          input: current.input || "",
          output: current.output || "",
          url: current.url || "",
          title: current.title || "",
          timestamp: current.timestamp || new Date().toISOString()
        }
      });
    }
  })()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
