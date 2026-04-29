(function () {
  "use strict";

  var rqlArmorFilterKey = "all";

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

  function slotFromEquippedArmorCode(src) {
    if (!src || typeof src !== "string") {
      return "";
    }
    var u = src.toLowerCase();
    if (u.indexOf("_hm_") !== -1) {
      return "head";
    }
    if (u.indexOf("_ts_") !== -1) {
      return "chest";
    }
    if (u.indexOf("_gl_") !== -1) {
      return "hands";
    }
    if (u.indexOf("_pt_") !== -1) {
      return "legs";
    }
    if (u.indexOf("_bt_") !== -1) {
      return "feet";
    }
    return "";
  }

  function getSelectedEquipmentSlotAlt() {
    var grids = document.querySelectorAll("div.grid.grid-cols-3");
    for (var g = 0; g < grids.length; g++) {
      var grid = grids[g];
      if (
        !grid.querySelector(
          'img[src*="equipment-slots"], img[src*="/Armor/"], img[src*="armor"]'
        )
      ) {
        continue;
      }
      var active = grid.querySelector("div.aspect-square[class*='glow-grade']");
      if (!active) {
        active = grid.querySelector("div[class*='glow-grade']");
      }
      if (!active) {
        continue;
      }
      var ph = active.querySelector('img[src*="equipment-slots"]');
      if (ph) {
        var alt = (ph.getAttribute("alt") || "").trim().toLowerCase();
        var slotFromPh = alt;
        if (!slotFromPh) {
          var psrc = ph.getAttribute("src") || "";
          var pm = psrc.match(/equipment-slots\/([a-z0-9_]+)\.webp/i);
          if (pm) {
            slotFromPh = pm[1].toLowerCase();
          }
        }
        if (slotAllowsArmorWeightFilter(slotFromPh)) {
          return slotFromPh;
        }
      }
      var imgs = active.querySelectorAll("img[src]");
      for (var ii = 0; ii < imgs.length; ii++) {
        var es = imgs[ii].getAttribute("src") || "";
        if (es.indexOf("equipment-slots") !== -1) {
          continue;
        }
        if (es.indexOf("Tex_Pol_Circle") !== -1) {
          continue;
        }
        if (
          es.indexOf("Equip/Armor") === -1 &&
          es.indexOf("equip/armor") === -1 &&
          es.toLowerCase().indexOf("/armor/") === -1
        ) {
          continue;
        }
        var slotGear = slotFromEquippedArmorCode(es);
        if (slotGear) {
          return slotGear;
        }
      }
      if (ph) {
        var psrc2 = ph.getAttribute("src") || "";
        var pm2 = psrc2.match(/equipment-slots\/([a-z0-9_]+)\.webp/i);
        if (pm2) {
          return pm2[1].toLowerCase();
        }
        var alt2 = (ph.getAttribute("alt") || "").trim().toLowerCase();
        if (alt2) {
          return alt2;
        }
      }
    }
    return "";
  }

  function slotAllowsArmorWeightFilter(alt) {
    if (!alt) {
      return false;
    }
    var s = alt.toLowerCase();
    return (
      s === "head" ||
      s === "chest" ||
      s === "hands" ||
      s === "legs" ||
      s === "feet"
    );
  }

  function syncArmorSlotToPage(alt) {
    var s = document.createElement("script");
    s.textContent =
      "(function(){window.__rqlArmorSlot=" + JSON.stringify(alt || "") + ";})();";
    (document.documentElement || document.head).appendChild(s);
    s.remove();
  }

  function removeArmorWeightFilterButtons() {
    var clothBtns = document.querySelectorAll(
      'button[data-rql-armor-weight="cloth"]'
    );
    for (var i = 0; i < clothBtns.length; i++) {
      var bar = clothBtns[i].closest("div.flex.items-center.gap-1");
      if (!bar) {
        continue;
      }
      var rm = bar.querySelectorAll(
        'button[data-rql-armor-weight="cloth"],button[data-rql-armor-weight="leather"],button[data-rql-armor-weight="plate"]'
      );
      for (var j = 0; j < rm.length; j++) {
        rm[j].remove();
      }
      var allB = bar.querySelector('button[data-rql-armor-weight="all"]');
      if (allB) {
        allB.removeAttribute("data-rql-armor-weight");
      }
    }
  }

  var RQL_BTN_INACTIVE =
    "inline-flex cursor-pointer items-center justify-center rounded font-medium transition hover:brightness-125 bg-light border-light border text-default h-[32px] min-w-8 text-sm px-3";
  var RQL_BTN_ACTIVE =
    "inline-flex cursor-pointer items-center justify-center rounded font-medium transition hover:brightness-125 bg-grade-11/80 text-default border border-grade-11 h-[32px] min-w-8 text-sm px-3";

  function setPageArmorWeight(v) {
    rqlArmorFilterKey = v;
    var s = document.createElement("script");
    s.textContent =
      "(function(){window.__rqlArmorWeight=" + JSON.stringify(v) + ";})();";
    (document.documentElement || document.head).appendChild(s);
    s.remove();
    applyArmorDropdownVisibility();
  }

  function styleArmorFilterButtons(bar, activeKey) {
    var bs = bar.querySelectorAll("button[data-rql-armor-weight]");
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      var k = b.getAttribute("data-rql-armor-weight");
      b.className = k === activeKey ? RQL_BTN_ACTIVE : RQL_BTN_INACTIVE;
    }
  }

  function bindArmorFilterDelegation() {
    if (document.documentElement.getAttribute("data-rql-armor-del") === "1") {
      return;
    }
    document.documentElement.setAttribute("data-rql-armor-del", "1");
    function onArmorFilterPointer(e) {
      var t = e.target;
      if (!t || !t.closest) {
        return;
      }
      var btn = t.closest("button[data-rql-armor-weight]");
      if (!btn) {
        return;
      }
      var bar = btn.closest("div.flex.items-center.gap-1");
      if (!bar || !bar.querySelector('button[data-rql-armor-weight="cloth"]')) {
        return;
      }
      var key = btn.getAttribute("data-rql-armor-weight");
      if (!key) {
        return;
      }
      setPageArmorWeight(key);
      styleArmorFilterButtons(bar, key);
      if (key !== "all") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    document.addEventListener("pointerdown", onArmorFilterPointer, true);
  }

  function ensureArmorWeightFilterButtons() {
    var slotAlt = getSelectedEquipmentSlotAlt();
    syncArmorSlotToPage(slotAlt);
    if (!slotAllowsArmorWeightFilter(slotAlt)) {
      removeArmorWeightFilterButtons();
      if (rqlArmorFilterKey !== "all") {
        setPageArmorWeight("all");
      } else {
        applyArmorDropdownVisibility();
      }
      return;
    }
    var bars = document.querySelectorAll("div.flex.items-center.gap-1");
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      if (bar.querySelector('img[src*="weapons/check"]')) {
        continue;
      }
      if (bar.querySelector('button[data-rql-armor-weight="cloth"]')) {
        continue;
      }
      var buttons = bar.querySelectorAll("button");
      if (buttons.length !== 1) {
        continue;
      }
      var allBtn = buttons[0];
      if (allBtn.textContent.replace(/\s+/g, " ").trim() !== "All") {
        continue;
      }
      bar.style.position = "relative";
      bar.style.zIndex = "50";
      bar.style.pointerEvents = "auto";
      allBtn.setAttribute("data-rql-armor-weight", "all");
      allBtn.style.pointerEvents = "auto";
      allBtn.style.position = "relative";
      allBtn.style.zIndex = "51";
      var pairs = [
        ["cloth", "Cloth"],
        ["leather", "Leather"],
        ["plate", "Plate"]
      ];
      for (var p = 0; p < pairs.length; p++) {
        var key = pairs[p][0];
        var label = pairs[p][1];
        var b = document.createElement("button");
        b.type = "button";
        b.className = RQL_BTN_INACTIVE;
        b.setAttribute("data-rql-armor-weight", key);
        b.style.pointerEvents = "auto";
        b.style.position = "relative";
        b.style.zIndex = "52";
        b.style.cursor = "pointer";
        var sp = document.createElement("span");
        sp.className = "";
        sp.textContent = label;
        sp.style.pointerEvents = "none";
        b.appendChild(sp);
        bar.appendChild(b);
      }
      setPageArmorWeight("all");
      styleArmorFilterButtons(bar, "all");
    }
  }

  function armorKindKeyFromRow(row) {
    var withData = row.querySelectorAll(
      "[data-item-id],[data-compound-id],[data-id]"
    );
    for (var a = 0; a < withData.length; a++) {
      var el = withData[a];
      var tid =
        el.getAttribute("data-item-id") ||
        el.getAttribute("data-compound-id") ||
        el.getAttribute("data-id");
      var p = armorPrefixFromIdString(tid);
      if (p === "Cloth") {
        return "cloth";
      }
      if (p === "Leather") {
        return "leather";
      }
      if (p === "Plate") {
        return "plate";
      }
    }
    var im = row.querySelector('img[src*="Equip/Armor"]');
    if (!im) {
      return null;
    }
    var p2 = armorPrefixFromIconSrc(im.src);
    if (p2 === "Cloth") {
      return "cloth";
    }
    if (p2 === "Leather") {
      return "leather";
    }
    if (p2 === "Plate") {
      return "plate";
    }
    return null;
  }

  function applyArmorDropdownVisibility() {
    if (!slotAllowsArmorWeightFilter(getSelectedEquipmentSlotAlt())) {
      var drops0 = document.querySelectorAll("div.absolute.z-20.max-h-80");
      for (var d0 = 0; d0 < drops0.length; d0++) {
        var drop0 = drops0[d0];
        var rows0 = drop0.querySelectorAll(":scope > div.flex.cursor-pointer");
        for (var r0 = 0; r0 < rows0.length; r0++) {
          rows0[r0].style.removeProperty("display");
        }
      }
      return;
    }
    var f = rqlArmorFilterKey;
    var drops = document.querySelectorAll("div.absolute.z-20.max-h-80");
    for (var d = 0; d < drops.length; d++) {
      var drop = drops[d];
      var rows = drop.querySelectorAll(":scope > div.flex.cursor-pointer");
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        if (!row.querySelector('img[src*="Equip/Armor"]')) {
          continue;
        }
        var kind = armorKindKeyFromRow(row);
        if (f === "all") {
          row.style.removeProperty("display");
        } else if (!kind || kind === f) {
          row.style.removeProperty("display");
        } else {
          row.style.display = "none";
        }
      }
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
    if (!slotAllowsArmorWeightFilter(getSelectedEquipmentSlotAlt())) {
      return;
    }
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
    applyArmorDropdownVisibility();
  }

  function runRemovals() {
    removeSlotBlocks();
    removeOrbWeaponButtons();
    removeArtifactsTabButton();
    removeCharBuilderStatPanel();
    removeStatsLucentTabBar();
    removeCombatPowerRow();
    removeStatPanelHr();
    ensureArmorWeightFilterButtons();
    enhanceArmorDropdownLabels();
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

  bindArmorFilterDelegation();

  var obs = new MutationObserver(scheduleRemove);
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
