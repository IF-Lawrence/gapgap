function gapgapEscapeResult(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');
}

function gapgapJsonString(value) {
  return '"' + gapgapEscapeResult(value) + '"';
}

function gapgapResult(ok, text, count, reason) {
  return '{"ok":' + (ok ? "true" : "false") +
    ',"text":' + gapgapJsonString(text || "") +
    ',"count":' + Number(count || 0) +
    ',"reason":' + gapgapJsonString(reason || "") + "}";
}

function gapgapCollectTextFrames(item, frames) {
  if (!item) return;
  if (item.typename === "TextFrame") {
    frames.push(item);
    return;
  }
  if (item.typename === "GroupItem") {
    for (var i = 0; i < item.pageItems.length; i += 1) {
      gapgapCollectTextFrames(item.pageItems[i], frames);
    }
    return;
  }
  if (item.textFrames && item.textFrames.length) {
    for (var j = 0; j < item.textFrames.length; j += 1) {
      gapgapCollectTextFrames(item.textFrames[j], frames);
    }
  }
}

function gapgapSelectionItems() {
  if (!app.documents.length) return [];
  var selection = app.activeDocument.selection;
  if (!selection) return [];

  if (selection.typename === "TextRange") return [selection];
  if (selection.typename === "TextFrame") return [selection];
  if (selection.typename === "Story") return [selection];

  var items = [];
  if (selection.length !== undefined) {
    for (var i = 0; i < selection.length; i += 1) items.push(selection[i]);
  } else {
    items.push(selection);
  }
  return items;
}

function gapgapTextTargetsFromSelection() {
  var items = gapgapSelectionItems();
  var targets = [];
  for (var i = 0; i < items.length; i += 1) {
    var item = items[i];
    if (!item) continue;
    if (item.typename === "TextRange" || item.typename === "TextFrame" || item.typename === "Story") {
      targets.push(item);
    } else {
      gapgapCollectTextFrames(item, targets);
    }
  }
  return targets;
}

function gapgapGetText(target) {
  if (!target) return "";
  if (target.typename === "TextRange") return target.contents;
  if (target.typename === "Story") return target.contents;
  return target.contents;
}

function gapgapSetText(target, value) {
  if (!target) return;
  target.contents = String(value || "");
}

function gapgapGetSelectedText() {
  if (!app.documents.length) return gapgapResult(false, "", 0, "no-document");
  var targets = gapgapTextTargetsFromSelection();
  if (!targets.length) return gapgapResult(false, "", 0, "no-text-selection");
  if (targets.length > 1) return gapgapResult(false, "", targets.length, "multiple-selection");
  return gapgapResult(true, gapgapGetText(targets[0]), 1, "");
}

function gapgapSetSelectedText(value) {
  if (!app.documents.length) return gapgapResult(false, "", 0, "no-document");
  var targets = gapgapTextTargetsFromSelection();
  if (!targets.length) return gapgapResult(false, "", 0, "no-text-selection");
  if (targets.length > 1) return gapgapResult(false, "", targets.length, "multiple-selection");
  gapgapSetText(targets[0], value);
  return gapgapResult(true, gapgapGetText(targets[0]), 1, "");
}

function gapgapCopyText(value) {
  var text = String(value || "");
  if (!text.length) return gapgapResult(false, "", 0, "empty");

  try {
    if ($.os.toLowerCase().indexOf("mac") >= 0) {
      app.system('printf %s ' + gapgapShellQuote(text) + ' | pbcopy');
    } else {
      app.system('cmd.exe /c echo ' + gapgapWindowsQuote(text) + ' | clip');
    }
    return gapgapResult(true, text, 1, "");
  } catch (error) {
    return gapgapResult(false, "", 0, "clipboard-error");
  }
}

function gapgapShellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function gapgapWindowsQuote(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}
