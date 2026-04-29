importScripts("release-check.js");

chrome.runtime.onMessage.addListener(function (msg, sender) {
  var tabId = sender.tab && sender.tab.id;
  if (!tabId || !msg || typeof msg.type !== "string") {
    return;
  }
  if (msg.type === "rql_armor_slot") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN",
      func: function (alt) {
        window.__rqlArmorSlot = alt || "";
      },
      args: [msg.alt || ""],
    }).catch(function () {});
    return;
  }
  if (msg.type === "rql_armor_weight") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN",
      func: function (w) {
        window.__rqlArmorWeight = w;
      },
      args: [msg.weight],
    }).catch(function () {});
  }
});
