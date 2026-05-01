(function () {
  "use strict";

  var TIER_KEY = "rql_rune_synergy_tier";
  var T2_RUNE_BORDER = "rgb(103, 194, 221)";
  var RUNE_ROW_SEL =
    "div.border-l-purple.flex.h-12[class*=\"cursor-pointer\"]";

  function applyRuneSynergyRowBorderForTier() {
    try {
      chrome.storage.local.get([TIER_KEY], function (r) {
        var t2 = r[TIER_KEY] !== "t3";
        var nodes = document.querySelectorAll(RUNE_ROW_SEL);
        for (var i = 0; i < nodes.length; i++) {
          var el = nodes[i];
          if (!el.querySelector('img[src*="/rune/"]')) {
            continue;
          }
          if (t2) {
            el.style.setProperty(
              "border-left-color",
              T2_RUNE_BORDER,
              "important"
            );
          } else {
            el.style.removeProperty("border-left-color");
          }
        }
      });
    } catch (_e) {}
  }

  function bindRuneTierBorderListener() {
    if (document.documentElement.getAttribute("data-rql-rune-border") === "1") {
      return;
    }
    document.documentElement.setAttribute("data-rql-rune-border", "1");
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local" || !changes[TIER_KEY]) {
          return;
        }
        applyRuneSynergyRowBorderForTier();
      });
    } catch (_e) {}
  }

  var SLOT_IMG_SELECTORS =
    'img[src*="equipment-slots/earring.webp"], img[src*="equipment-slots/brooch.webp"]';

  function removeSlotBlocks() {
    var imgs = document.querySelectorAll(SLOT_IMG_SELECTORS);
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var block =
        img.closest("div.bg-light.aspect-square") ||
        img.closest("div.aspect-square");
      if (block && block.parentNode) {
        block.remove();
      }
    }
  }

  function removeOrbWeaponButtons() {
    var imgs = document.querySelectorAll(
      'img[src*="weapons/check/orb.webp"]'
    );
    for (var i = 0; i < imgs.length; i++) {
      var btn = imgs[i].closest("button");
      if (btn && btn.parentNode) {
        btn.remove();
      }
    }
  }

  function removeArtifactsTabButton() {
    var buttons = document.querySelectorAll('button[type="button"]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (!btn.querySelector('[class*="puzzle-piece"]')) {
        continue;
      }
      if (btn.textContent.indexOf("Artifacts") === -1) {
        continue;
      }
      btn.remove();
    }
  }

  function removeCharBuilderStatPanel() {
    var el = document.querySelector('[id="tl:char-builder-stat-panel"]');
    if (el && el.parentNode) {
      el.remove();
    }
  }

  function removeStatsLucentTabBar() {
    var nodes = document.querySelectorAll("div.grid.w-full.grid-cols-2");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (
        n.querySelector('[class*="chart-bar"]') &&
        n.querySelector('[class*="coins-bold"]')
      ) {
        n.remove();
      }
    }
  }

  function removeCombatPowerRow() {
    var ps = document.querySelectorAll("p.truncate.text-xs.text-darker");
    for (var i = 0; i < ps.length; i++) {
      if (ps[i].textContent.replace(/\s+/g, " ").trim() !== "Combat Power") {
        continue;
      }
      var row = ps[i].closest("div.justify-between.rounded-b");
      if (row && row.parentNode) {
        row.remove();
      }
    }
  }

  function removeStatPanelHr() {
    var hrs = document.querySelectorAll("hr.mx-2");
    for (var hi = 0; hi < hrs.length; hi++) {
      var hr = hrs[hi];
      var cls = hr.getAttribute("class") || "";
      if (cls.indexOf("border-dark") === -1) {
        continue;
      }
      hr.remove();
    }
  }

  function armorPrefixFromIdString(id) {
    if (!id || typeof id !== "string") {
      return null;
    }
    var low = id.toLowerCase();
    if (low.indexOf("leather_") !== -1 || low.indexOf("_leather_") !== -1) {
      return "Leather";
    }
    if (low.indexOf("plate_") !== -1 || low.indexOf("_plate_") !== -1) {
      return "Plate";
    }
    if (low.indexOf("fabric_") !== -1 || low.indexOf("_fabric_") !== -1) {
      return "Cloth";
    }
    return null;
  }

  function armorPrefixFromIconSrc(src) {
    if (!src || typeof src !== "string") {
      return null;
    }
    var s = src.toLowerCase();
    if (
      s.indexOf("_fa_") !== -1 ||
      s.indexOf("p_set_fa") !== -1 ||
      s.indexOf("p_part_fa") !== -1
    ) {
      return "Cloth";
    }
    if (
      s.indexOf("_pl_") !== -1 ||
      s.indexOf("p_set_pl") !== -1 ||
      s.indexOf("p_part_pl") !== -1
    ) {
      return "Plate";
    }
    if (
      s.indexOf("_le_") !== -1 ||
      s.indexOf("p_set_le") !== -1 ||
      s.indexOf("p_part_le") !== -1
    ) {
      return "Leather";
    }
    return null;
  }

  function enhanceArmorDropdownLabels() {
    var drops = document.querySelectorAll("div.absolute.z-20.max-h-80");
    for (var d = 0; d < drops.length; d++) {
      var drop = drops[d];
      var rows = drop.querySelectorAll(":scope > div.flex.cursor-pointer");
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var pCol = row.querySelector("p.flex.flex-col");
        if (!pCol) {
          continue;
        }
        var span = pCol.querySelector(
          "span.text-xs.text-darker.text-opacity-75"
        );
        if (!span || span.getAttribute("data-rql-ap") === "1") {
          continue;
        }
        var prefix = null;
        var withData = row.querySelectorAll(
          "[data-item-id],[data-compound-id],[data-id]"
        );
        for (var a = 0; a < withData.length && !prefix; a++) {
          var el = withData[a];
          var tid =
            el.getAttribute("data-item-id") ||
            el.getAttribute("data-compound-id") ||
            el.getAttribute("data-id");
          prefix = armorPrefixFromIdString(tid);
        }
        if (!prefix) {
          var im = row.querySelector('img[src*="Equip/Armor"]');
          if (im) {
            prefix = armorPrefixFromIconSrc(im.src);
          }
        }
        if (!prefix) {
          continue;
        }
        var raw = span.textContent.replace(/\s+/g, " ").trim();
        if (!raw) {
          continue;
        }
        if (raw.indexOf(prefix + " ") === 0) {
          span.setAttribute("data-rql-ap", "1");
          continue;
        }
        span.textContent = prefix + " " + raw;
        span.setAttribute("data-rql-ap", "1");
      }
    }
  }

  function patchAttributeHeaderSecondAlways49() {
    var hs = document.querySelectorAll(
      'h3[class*="bg-dark"][class*="flex-center"]'
    );
    for (var i = 0; i < hs.length; i++) {
      var el = hs[i];
      var t = el.textContent || "";
      if (!/\(\s*\d+\s*\/\s*\d+\s*\)/.test(t)) {
        continue;
      }
      var next = t.replace(
        /\(\s*(\d+)\s*\/\s*\d+\s*\)/g,
        function (_m, usedStr) {
          return "(" + usedStr + "/49)";
        }
      );
      if (next !== t) {
        el.textContent = next;
      }
    }
  }

  function getAttributePointsUsedFromHeader() {
    var hs = document.querySelectorAll(
      'h3[class*="bg-dark"][class*="flex-center"]'
    );
    for (var i = 0; i < hs.length; i++) {
      var m = (hs[i].textContent || "").match(
        /\(\s*(\d+)\s*\/\s*\d+\s*\)/
      );
      if (m) {
        return parseInt(m[1], 10);
      }
    }
    return -1;
  }

  function lockAttributePlusButtonsAt49() {
    var locked = document.querySelectorAll('[data-rql-attr-plus-lock="1"]');
    for (var r = 0; r < locked.length; r++) {
      var x = locked[r];
      x.removeAttribute("data-rql-attr-plus-lock");
      x.disabled = false;
      x.style.removeProperty("pointer-events");
      x.style.removeProperty("opacity");
      x.style.removeProperty("cursor");
    }
    var used = getAttributePointsUsedFromHeader();
    if (used < 49) {
      return;
    }
    var candidates = document.querySelectorAll(
      "button.inline-flex.aspect-square"
    );
    for (var j = 0; j < candidates.length; j++) {
      var b = candidates[j];
      var cls = b.getAttribute("class") || "";
      if (cls.indexOf("min-w-8") === -1) {
        continue;
      }
      if (!b.querySelector('[class*="plus-bold"]')) {
        continue;
      }
      b.setAttribute("data-rql-attr-plus-lock", "1");
      b.disabled = true;
      b.style.setProperty("pointer-events", "none", "important");
      b.style.setProperty("opacity", "0.42", "important");
      b.style.setProperty("cursor", "not-allowed", "important");
    }
  }

  function runRemovals() {
    removeSlotBlocks();
    removeOrbWeaponButtons();
    removeArtifactsTabButton();
    removeCharBuilderStatPanel();
    removeStatsLucentTabBar();
    removeCombatPowerRow();
    removeStatPanelHr();
    enhanceArmorDropdownLabels();
    applyRuneSynergyRowBorderForTier();
    patchAttributeHeaderSecondAlways49();
    lockAttributePlusButtonsAt49();
  }

  function bindAttrPlusClickBlock() {
    if (document.documentElement.getAttribute("data-rql-attr-plus-cap") === "1") {
      return;
    }
    document.documentElement.setAttribute("data-rql-attr-plus-cap", "1");
    document.addEventListener(
      "pointerdown",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) {
          return;
        }
        var b = t.closest('button[data-rql-attr-plus-lock="1"]');
        if (!b) {
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      true
    );
  }

  var pending = false;
  function scheduleRemove() {
    if (pending) {
      return;
    }
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      runRemovals();
    });
  }

  runRemovals();

  bindRuneTierBorderListener();
  bindAttrPlusClickBlock();

  var obs = new MutationObserver(scheduleRemove);
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
