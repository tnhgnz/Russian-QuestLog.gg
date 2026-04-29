(function () {
  "use strict";

  var TIER_KEY = "rql_rune_synergy_tier";

  function applyTier(tier) {
    var t = tier === "t3" ? "t3" : "t2";
    try {
      document.documentElement.setAttribute(
        "data-rql-rune-synergies-json",
        chrome.runtime.getURL("runes/" + t + ".json")
      );
    } catch (_e) {}
  }

  function initRadios() {
    var inputs = document.querySelectorAll('input[name="tier"]');
    chrome.storage.local.get([TIER_KEY], function (r) {
      var v = r[TIER_KEY] === "t3" ? "t3" : "t2";
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].checked = inputs[i].value === v;
      }
    });
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].addEventListener("change", function () {
        if (!this.checked) {
          return;
        }
        var o = {};
        o[TIER_KEY] = this.value;
        chrome.storage.local.set(o);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRadios);
  } else {
    initRadios();
  }
})();
