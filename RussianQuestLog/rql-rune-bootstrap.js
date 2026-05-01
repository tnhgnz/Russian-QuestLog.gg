(function () {
  "use strict";

  var TIER_KEY = "rql_rune_synergy_tier";

  function setSynergyUrlFromTier(tier) {
    var t = tier === "t3" ? "t3" : "t2";
    try {
      document.documentElement.setAttribute(
        "data-rql-rune-synergies-json",
        chrome.runtime.getURL("runes/" + t + ".json")
      );
    } catch (_e) {}
  }

  setSynergyUrlFromTier("t2");
  try {
    chrome.storage.local.get([TIER_KEY], function (r) {
      setSynergyUrlFromTier(r[TIER_KEY]);
    });
  } catch (_e2) {}

  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local" || !changes[TIER_KEY]) {
        return;
      }
      setSynergyUrlFromTier(changes[TIER_KEY].newValue);
    });
  } catch (_e3) {}
})();
