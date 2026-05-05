(function () {
  "use strict";

  var MASTERY_JSON = "mastery.json";
  var MASTERY_BETWEEN_NODES_IMG = "icons/mastery/mastery_arrow.png";

  var WEAPON_DETECT = [
    { key: "shield", re: /shield|buckler/i },
    { key: "greatsword", re: /greatsword|great_sword|sword2h|sword_2h|2h.*sword|gargantuan.*sword/i },
    { key: "crossbow", re: /crossbow|cross_bow|arbalest/i },
    { key: "longbow", re: /longbow|long_bow|netherbow|tevent'?s.*arc.*wailing.*death/i },
    { key: "wand", re: /\/wand|_wand|wand\.webp/i },
    { key: "staff", re: /\/staff|_staff|staff\.webp/i },
    { key: "dagger", re: /dagger|dag_|knife/i },
    { key: "spear", re: /spear|polearm|halberd|ranseur|lance|pike|javelin|it_p_spear|weapon_spear|sw2/i },
  ];

  var WEAPON_KEY_TO_ENGLISH = {
    shield: "SnS",
    greatsword: "Greatsword",
    longbow: "Longbow",
    crossbow: "Crossbow",
    staff: "Staff",
    wand: "Wand",
    dagger: "Dagger",
    spear: "Spear"
  };

  var CC_CHANCE_EXPAND_KEYS = [
    "stun_chance",
    "fear_chance",
    "bind_chance",
    "petrification_chance",
    "sleep_chance",
    "collision_chance",
    "silence_chance",
    "weaken_chance"
  ];

  function wkLabel(wk) {
    if (!wk) {
      return "";
    }
    var t = WEAPON_KEY_TO_ENGLISH[wk];
    if (t) {
      return t;
    }
    return wk.charAt(0).toUpperCase() + wk.slice(1).toLowerCase();
  }

  var masteryDataCache = null;
  var masteryLoadPromise = null;

  function isWeaponDataKey(k, data) {
    if (!k || k === "__rql") {
      return false;
    }
    var w = data[k];
    return !!(w && w.branches);
  }

  function resolveMasteryImage(imgPath) {
    if (!imgPath || typeof imgPath !== "string") {
      return "";
    }
    var trimmed = imgPath.replace(/^\.\//, "").replace(/^\/+/, "");
    if (/^icons\/mastery\//.test(trimmed)) {
      try {
        return chrome.runtime.getURL(trimmed);
      } catch (_e1) {
        return "";
      }
    }
    var legacy = trimmed.replace(/^images\/(mastery_img|mastery_icons)\//, "");
    try {
      return chrome.runtime.getURL("icons/mastery/" + legacy);
    } catch (_e2) {
      return "";
    }
  }

  function imgSizeForPath(imgPath) {
    if (!imgPath) {
      return 22;
    }
    var s = imgPath.toLowerCase();
    if (/attack_img\.png|defense_img\.png|support_img\.png/.test(s)) {
      return 22;
    }
    if (/utility\d|_utility/.test(s)) {
      return 26;
    }
    return 24;
  }

  function esc(s) {
    if (s == null) {
      return "";
    }
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  var MAX_WEAPONS_SHOWN = 2;

  var MASTERY_TITLE_TOTAL = 16;

  var LS_NODES_KEY = "rql-mastery-node-selection-v1";

  function loadAllNodeSelections() {
    try {
      var raw = localStorage.getItem(LS_NODES_KEY);
      if (!raw) {
        return {};
      }
      var j = JSON.parse(raw);
      return typeof j === "object" && j && !Array.isArray(j) ? j : {};
    } catch (_e) {
      return {};
    }
  }

  function getWeaponNodes(weaponKey) {
    var all = loadAllNodeSelections();
    var a = all[weaponKey];
    return Array.isArray(a) ? a.slice() : [];
  }

  function saveWeaponNodes(weaponKey, ids) {
    var all = loadAllNodeSelections();
    if (!ids || ids.length === 0) {
      delete all[weaponKey];
    } else {
      all[weaponKey] = ids.slice(0, MASTERY_TITLE_TOTAL);
    }
    try {
      localStorage.setItem(LS_NODES_KEY, JSON.stringify(all));
    } catch (_e2) {}
  }

  function getEntryNodeId(weapon) {
    if (!weapon || !weapon.branches || weapon.branches.length < 3) {
      return null;
    }
    if (weapon.rootBonus) {
      return "1:root";
    }
    var mid = weapon.branches[1];
    var bb = (mid && mid.branch_bonuses) || [];
    if (bb.length > 1) {
      return "1:0";
    }
    return null;
  }

  function parseNodeId(nodeId) {
    var i = nodeId.indexOf(":");
    if (i < 0) {
      return null;
    }
    var br = parseInt(nodeId.slice(0, i), 10);
    if (isNaN(br)) {
      return null;
    }
    var rest = nodeId.slice(i + 1);
    if (rest === "root") {
      return { branch: br, root: true, k: null };
    }
    var kk = parseInt(rest, 10);
    if (isNaN(kk)) {
      return null;
    }
    return { branch: br, root: false, k: kk };
  }

  function canAddSelection(weapon, nodeId, selectedIds) {
    if (selectedIds.indexOf(nodeId) !== -1) {
      return false;
    }
    if (selectedIds.length >= MASTERY_TITLE_TOTAL) {
      return false;
    }
    var entryId = getEntryNodeId(weapon);
    if (!entryId) {
      return false;
    }
    if (nodeId === entryId) {
      return true;
    }
    if (selectedIds.indexOf(entryId) === -1) {
      return false;
    }
    var p = parseNodeId(nodeId);
    if (!p || p.root) {
      return false;
    }
    var b = p.branch;
    var k = p.k;
    if (k === 0) {
      if (b === 1 && weapon.rootBonus) {
        return selectedIds.indexOf("1:root") !== -1;
      }
      return true;
    }
    return selectedIds.indexOf(b + ":" + (k - 1)) !== -1;
  }

  function pruneSelection(weapon, selectedIds, removeId) {
    var entryId = getEntryNodeId(weapon);
    if (!entryId) {
      return selectedIds.filter(function (x) {
        return x !== removeId;
      });
    }
    if (removeId === entryId) {
      return [];
    }
    var p = parseNodeId(removeId);
    if (!p || p.root) {
      return selectedIds.filter(function (x) {
        return x !== removeId;
      });
    }
    var b = p.branch;
    var k0 = p.k;
    return selectedIds.filter(function (id) {
      if (id === removeId) {
        return false;
      }
      var q = parseNodeId(id);
      if (!q || q.root) {
        return true;
      }
      if (q.branch !== b) {
        return true;
      }
      return q.k < k0;
    });
  }

  function makePickOpts(weapon, nodeId, selectedIds) {
    var sel = selectedIds.indexOf(nodeId) !== -1;
    var locked = !sel && !canAddSelection(weapon, nodeId, selectedIds);
    return { nodeId: nodeId, selected: sel, locked: locked };
  }

  function getStatsForNode(weapon, nodeId) {
    if (!weapon || !nodeId) {
      return null;
    }
    if (nodeId === "1:root") {
      return weapon.rootBonus && weapon.rootBonus.stats
        ? weapon.rootBonus.stats
        : null;
    }
    var p = parseNodeId(nodeId);
    if (!p || p.root) {
      return null;
    }
    var branch = weapon.branches[p.branch];
    var bonuses = (branch && branch.branch_bonuses) || [];
    var node = bonuses[p.k];
    return node && node.stats ? node.stats : null;
  }

  function mergeStatsInto(out, stats) {
    if (!stats || typeof stats !== "object") {
      return;
    }
    var k;
    for (k in stats) {
      if (!Object.prototype.hasOwnProperty.call(stats, k)) {
        continue;
      }
      var v = stats[k];
      if (typeof v === "number" && !isNaN(v)) {
        out[k] = (out[k] || 0) + v;
      }
    }
  }

  function normalizeMasteryTotals(totals) {
    if (!totals || typeof totals !== "object") {
      return totals;
    }
    var ms = totals.move_speed;
    if (typeof ms === "number" && !isNaN(ms) && ms !== 0) {
      totals.move_speed_bonus = (totals.move_speed_bonus || 0) + ms;
      delete totals.move_speed;
    }
    var cc = totals.cc_chance;
    if (typeof cc === "number" && !isNaN(cc) && cc !== 0) {
      var ci;
      for (ci = 0; ci < CC_CHANCE_EXPAND_KEYS.length; ci++) {
        var ck = CC_CHANCE_EXPAND_KEYS[ci];
        totals[ck] = (totals[ck] || 0) + cc;
      }
      delete totals.cc_chance;
    }
    var dd = totals.debuff_duration;
    if (typeof dd === "number" && !isNaN(dd) && dd !== 0) {
      totals.debuff_duration = -Math.abs(dd);
    }
    return totals;
  }

  function aggregateMasteryBonuses(masteryData) {
    var totals = {};
    if (!masteryData) {
      return totals;
    }
    var keys = pickWeaponKeys(masteryData).slice(0, 1);
    var ki;
    for (ki = 0; ki < keys.length; ki++) {
      var wk = keys[ki];
      var weapon = masteryData[wk];
      if (!weapon) {
        continue;
      }
      var ids = getWeaponNodes(wk);
      var ii;
      for (ii = 0; ii < ids.length; ii++) {
        mergeStatsInto(totals, getStatsForNode(weapon, ids[ii]));
      }
    }
    return totals;
  }

  function getIconPathForNode(weapon, nodeId) {
    if (!weapon || !nodeId) {
      return "";
    }
    if (nodeId === "1:root") {
      return weapon.rootBonus && weapon.rootBonus.img
        ? weapon.rootBonus.img
        : "";
    }
    var p = parseNodeId(nodeId);
    if (!p || p.root) {
      return "";
    }
    var branch = weapon.branches[p.branch];
    var bonuses = (branch && branch.branch_bonuses) || [];
    var node = bonuses[p.k];
    return node && node.img ? node.img : "";
  }

  function statIconsAndWeaponLabels(data) {
    var icons = {};
    var types = {};
    if (!data) return { icons: icons, types: types };
    var keys = pickWeaponKeys(data).slice(0, 1);
    var ki;
    for (ki = 0; ki < keys.length; ki++) {
      var wk = keys[ki];
      var weapon = data[wk];
      if (!weapon) continue;
      var lbl = wkLabel(wk);
      var ids = getWeaponNodes(wk);
      var ii;
      for (ii = 0; ii < ids.length; ii++) {
        var imgPath = getIconPathForNode(weapon, ids[ii]);
        if (!imgPath) continue;
        var stats = getStatsForNode(weapon, ids[ii]);
        if (!stats || typeof stats !== "object") continue;
        var resolved = resolveMasteryImage(imgPath);
        if (!resolved) continue;
        var sk;
        for (sk in stats) {
          if (!Object.prototype.hasOwnProperty.call(stats, sk)) continue;
          var v = stats[sk];
          if (typeof v !== "number" || isNaN(v) || v === 0) continue;
          var markKeys = [sk];
          if (sk === "move_speed") {
            markKeys = ["move_speed_bonus"];
          } else if (sk === "cc_chance") {
            markKeys = CC_CHANCE_EXPAND_KEYS.slice();
          }
          var mi;
          for (mi = 0; mi < markKeys.length; mi++) {
            var mk = markKeys[mi];
            if (!icons[mk]) icons[mk] = resolved;
            if (!types[mk]) types[mk] = lbl;
          }
        }
      }
    }
    return { icons: icons, types: types };
  }

  function syncMasteryBonusesAttr() {
    try {
      if (!masteryDataCache) {
        document.documentElement.removeAttribute("data-rql-mastery-bonuses");
        document.documentElement.removeAttribute("data-rql-mastery-stat-icons");
        document.documentElement.removeAttribute("data-rql-mastery-active-weapons");
        document.documentElement.removeAttribute("data-rql-mastery-bonus-weapons");
        document.documentElement.removeAttribute(
          "data-rql-mastery-stat-weapon-types"
        );
        return;
      }
      var activeKeys = pickWeaponKeys(masteryDataCache);
      var bonusKeys = activeKeys.slice(0, 1);
      var totals = normalizeMasteryTotals(
        aggregateMasteryBonuses(masteryDataCache)
      );
      var maps = statIconsAndWeaponLabels(masteryDataCache);
      document.documentElement.setAttribute(
        "data-rql-mastery-active-weapons",
        JSON.stringify(activeKeys)
      );
      document.documentElement.setAttribute(
        "data-rql-mastery-bonus-weapons",
        JSON.stringify(bonusKeys)
      );
      document.documentElement.setAttribute(
        "data-rql-mastery-bonuses",
        JSON.stringify(totals)
      );
      document.documentElement.setAttribute(
        "data-rql-mastery-stat-icons",
        JSON.stringify(maps.icons)
      );
      document.documentElement.setAttribute(
        "data-rql-mastery-stat-weapon-types",
        JSON.stringify(maps.types)
      );
      document.dispatchEvent(
        new CustomEvent("rql-mastery-bonuses-updated", { detail: totals })
      );
    } catch (_s) {
      try {
        document.documentElement.removeAttribute("data-rql-mastery-bonuses");
        document.documentElement.removeAttribute("data-rql-mastery-stat-icons");
        document.documentElement.removeAttribute("data-rql-mastery-active-weapons");
        document.documentElement.removeAttribute("data-rql-mastery-bonus-weapons");
        document.documentElement.removeAttribute(
          "data-rql-mastery-stat-weapon-types"
        );
      } catch (_s2) {}
    }
  }

  function classifyWeaponCombined(alt, src) {
    var a = ((alt || "") + "").trim();
    var s = ((src || "") + "").trim();
    var t = (a + " " + s).trim();
    if (!t) {
      return null;
    }
    var sLower = s.toLowerCase();

    if (/equipment-slots\/(main_hand|off_hand)\.webp/i.test(s)) {
      return null;
    }
    if (
      /^(main_hand|off_hand)$/i.test(a) &&
      !/\/Equip\/Weapon\//i.test(s)
    ) {
      return null;
    }

    if (/it_p_sword2h|sword_2h/i.test(sLower)) {
      return "greatsword";
    }
    if (/it_p_sword_\d/i.test(sLower)) {
      return "shield";
    }

    var h;
    for (h = 0; h < WEAPON_DETECT.length; h++) {
      if (WEAPON_DETECT[h].re.test(t)) {
        return WEAPON_DETECT[h].key;
      }
    }
    return null;
  }

  function weaponImgFromSlotCell(cell) {
    if (!cell || !cell.querySelector) {
      return null;
    }
    return (
      cell.querySelector("div.isolate.p-4 img[src]") ||
      cell.querySelector("div.isolate[class*='p-4'] img[src]")
    );
  }

  function weaponKeyFromSlotCell(cell) {
    var im = weaponImgFromSlotCell(cell);
    if (!im) {
      return null;
    }
    var s = im.getAttribute("src") || "";
    if (!/\/Equip\/Weapon\//i.test(s)) {
      return null;
    }
    return classifyWeaponCombined(im.getAttribute("alt") || "", s);
  }

  function keysFromEquipmentGrid() {
    var grid =
      document.querySelector("div.grid.grid-cols-3") ||
      document.querySelector("div.grid[class*='grid-cols-3']");
    if (!grid || !grid.children || grid.children.length < 1) {
      return [];
    }
    var out = [];
    var seen = Object.create(null);
    var i;
    for (i = 0; i < Math.min(2, grid.children.length); i++) {
      var k = weaponKeyFromSlotCell(grid.children[i]);
      if (k && !seen[k]) {
        seen[k] = true;
        out.push(k);
      }
    }
    return out;
  }

  function detectEquippedWeaponKeys() {
    return keysFromEquipmentGrid().slice(0, MAX_WEAPONS_SHOWN);
  }

  function pickWeaponKeys(masteryData) {
    if (!masteryData) {
      return [];
    }
    var seen = Object.create(null);
    var use = [];
    var j;
    var det = detectEquippedWeaponKeys();
    for (j = 0; j < det.length && use.length < MAX_WEAPONS_SHOWN; j++) {
      var wk = det[j];
      if (!wk || seen[wk] || !isWeaponDataKey(wk, masteryData)) {
        continue;
      }
      seen[wk] = true;
      use.push(wk);
    }
    if (use.length < MAX_WEAPONS_SHOWN) {
      try {
        var raw = document.documentElement.getAttribute("data-rql-weapon-keys");
        if (raw) {
          var fromAttr = JSON.parse(raw);
          if (Array.isArray(fromAttr)) {
            var ai;
            for (ai = 0; ai < fromAttr.length && use.length < MAX_WEAPONS_SHOWN; ai++) {
              var ak = fromAttr[ai];
              if (!ak || seen[ak] || !isWeaponDataKey(ak, masteryData)) {
                continue;
              }
              seen[ak] = true;
              use.push(ak);
            }
          }
        }
      } catch (_a) {}
    }
    if (use.length < MAX_WEAPONS_SHOWN) {
      var wkeys = Object.keys(masteryData);
      var candidates = [];
      var ki;
      for (ki = 0; ki < wkeys.length; ki++) {
        var sk = wkeys[ki];
        if (!sk || seen[sk] || !isWeaponDataKey(sk, masteryData)) {
          continue;
        }
        var ids = getWeaponNodes(sk);
        if (!ids || !ids.length) {
          continue;
        }
        candidates.push({ key: sk, n: ids.length });
      }
      candidates.sort(function (a, b) {
        return b.n - a.n;
      });
      var ci;
      for (ci = 0; ci < candidates.length && use.length < MAX_WEAPONS_SHOWN; ci++) {
        var ck = candidates[ci].key;
        if (seen[ck]) continue;
        seen[ck] = true;
        use.push(ck);
      }
    }
    return use;
  }

  function loadMasteryData() {
    if (masteryDataCache) {
      return Promise.resolve(masteryDataCache);
    }
    if (masteryLoadPromise) {
      return masteryLoadPromise;
    }
    masteryLoadPromise = fetch(chrome.runtime.getURL(MASTERY_JSON))
      .then(function (r) {
        if (!r.ok) {
          throw new Error("mastery json");
        }
        return r.json();
      })
      .then(function (j) {
        masteryDataCache = j;
        return j;
      })
      .catch(function () {
        masteryDataCache = {};
        return masteryDataCache;
      });
    return masteryLoadPromise;
  }

  function formatStatsTooltipHtml(stats) {
    if (!stats || typeof stats !== "object") {
      return "";
    }
    var keys = Object.keys(stats);
    if (keys.length === 0) {
      return "";
    }
    var i;
    var parts = [];
    for (i = 0; i < keys.length; i++) {
      var kk = keys[i];
      parts.push(
        '<div class="rql-mastery-tip-line"><span class="rql-mastery-tip-k">' +
          esc(kk) +
          '</span> <span class="rql-mastery-tip-v">' +
          esc(String(stats[kk])) +
          "</span></div>"
      );
    }
    return parts.join("");
  }

  function hexButton(imgUrl, title, imgPathHint, stats, uiOpts) {
    uiOpts = uiOpts || {};
    var gridMajor = !!uiOpts.gridMajor;
    var pick = uiOpts.pick;
    var w = imgSizeForPath(imgPathHint || "");
    if (gridMajor) {
      w = Math.min(w + 4, 36);
    } else {
      w = Math.max(16, w - 3);
    }
    var statsHtml = formatStatsTooltipHtml(stats);
    var titleTrim = title && String(title).trim();
    var tipBlock =
      titleTrim || statsHtml
        ? '<div class="rql-mastery-tooltip" role="tooltip">' +
          (titleTrim
            ? '<div class="rql-mastery-tip-title">' + esc(titleTrim) + "</div>"
            : "") +
          statsHtml +
          "</div>"
        : "";
    var majorClass = gridMajor ? " rql-mastery-node-cell--grid-major" : "";
    var selClass =
      pick && pick.selected ? " rql-mastery-node-cell--selected" : "";
    var lockClass = pick && pick.locked ? " rql-mastery-node-cell--locked" : "";
    var dataAttr =
      pick && pick.nodeId
        ? ' data-rql-node-id="' + esc(pick.nodeId) + '"'
        : "";
    return (
      '<div class="rql-mastery-node-cell' +
        (tipBlock ? " rql-mastery-node" : "") +
        majorClass +
        selClass +
        lockClass +
        '"' +
        dataAttr +
        ">" +
      '<button type="button" class="rql-mastery-hit" tabindex="0">' +
      '<span class="rql-mastery-hex-outer clip-hexagon">' +
      '<span class="rql-mastery-hex-inner clip-hexagon">' +
      (imgUrl
        ? '<img src="' +
          esc(imgUrl) +
          '" width="' +
          w +
          '" height="' +
          w +
          '" alt="" draggable="false">'
        : "") +
      "</span></span></button>" +
      tipBlock +
      "</div>"
    );
  }

  function connectorImg(connectorUrl) {
    if (!connectorUrl) {
      return "";
    }
    return (
      '<span class="rql-mastery-connector-slot" aria-hidden="true">' +
      '<img class="rql-mastery-connector-img" src="' +
      esc(connectorUrl) +
      '" width="26" height="26" alt="" draggable="false">' +
      "</span>"
    );
  }

  function emptyLeftCell() {
    return (
      '<div class="rql-mastery-row-lead rql-mastery-row-lead--empty" aria-hidden="true"></div>'
    );
  }

  function rootLeftCell(rootBonus, weapon, selectedIds) {
    if (!rootBonus) {
      return emptyLeftCell();
    }
    var pick = makePickOpts(weapon, "1:root", selectedIds);
    var imgUrl = resolveMasteryImage(rootBonus.img);
    return (
      '<div class="rql-mastery-row-lead">' +
      hexButton(imgUrl, rootBonus.title, rootBonus.img, rootBonus.stats, {
        gridMajor: true,
        pick: pick,
      }) +
      "</div>"
    );
  }

  function renderBranchRow(
    weapon,
    branchIndex,
    branch,
    connectorUrl,
    selectedIds
  ) {
    var parts = [];
    var bonuses = (branch && branch.branch_bonuses) || [];

    var k;

    if (branchIndex === 1) {
      parts.push(rootLeftCell(weapon.rootBonus, weapon, selectedIds));
    } else {
      parts.push(emptyLeftCell());
    }

    for (k = 0; k < bonuses.length; k++) {
      var b = bonuses[k];
      if (connectorUrl) {
        parts.push(connectorImg(connectorUrl));
      }
      var gridMajor = k === 2 || k === 5 || k === 8;
      var nodeId = branchIndex + ":" + k;
      var pick = makePickOpts(weapon, nodeId, selectedIds);
      var iu = resolveMasteryImage(b.img);
      parts.push(
        hexButton(iu, b.title, b.img, b.stats, {
          gridMajor: gridMajor,
          pick: pick,
        })
      );
    }

    return (
      '<div class="rql-mastery-branch-row">' + parts.join("") + "</div>"
    );
  }

  function weaponDisplayName(key) {
    if (!key) {
      return "";
    }
    var s = String(key);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function renderWeaponBlock(weaponKey, weapon, connectorUrl) {
    if (!weapon || !weapon.branches || weapon.branches.length < 3) {
      return "";
    }
    var selectedIds = getWeaponNodes(weaponKey);
    var picked = selectedIds.length;
    var rows = [];
    var b;
    for (b = 0; b < 3; b++) {
      rows.push(
        renderBranchRow(weapon, b, weapon.branches[b], connectorUrl, selectedIds)
      );
    }
    return (
      '<section class="rql-mastery-weapon" data-rql-weapon="' +
      esc(weaponKey) +
      '">' +
      '<p class="rql-mastery-weapon-title">' +
      esc(weaponDisplayName(weaponKey)) +
      ' <span class="rql-mastery-weapon-progress">(' +
      picked +
      "/" +
      MASTERY_TITLE_TOTAL +
      ")</span></p>" +
      '<div class="rql-mastery-weapon-inner font-figtree">' +
      rows.join("") +
      "</div></section>"
    );
  }

  function buildMasteryMarkup(masteryData) {
    var keys = pickWeaponKeys(masteryData);
    if (keys.length === 0) {
      return "";
    }
    var connectorUrl = resolveMasteryImage(MASTERY_BETWEEN_NODES_IMG);
    var blocks = [];
    var i;
    for (i = 0; i < keys.length; i++) {
      var wk = keys[i];
      blocks.push(renderWeaponBlock(wk, masteryData[wk], connectorUrl));
    }
    return blocks.join("");
  }

  function rerenderMasteryBodyFromCache() {
    var body = document.getElementById("rql-mastery-body");
    if (!body) {
      return;
    }
    if (!masteryDataCache) {
      refreshMasteryBody();
      return;
    }
    body.innerHTML = buildMasteryMarkup(masteryDataCache);
    syncMasteryBonusesAttr();
    try {
      if (typeof window.__RQL_MASTERY.onTotalsRefresh === "function") {
        window.__RQL_MASTERY.onTotalsRefresh();
      }
    } catch (_eO) {}
  }

  function onMasteryNodePickClick(e) {
    var hit = e.target.closest(".rql-mastery-hit");
    if (!hit) {
      return;
    }
    var cell = hit.closest("[data-rql-node-id]");
    if (!cell) {
      return;
    }
    if (cell.classList.contains("rql-mastery-node-cell--locked")) {
      e.preventDefault();
      return;
    }
    var section = cell.closest("[data-rql-weapon]");
    if (!section) {
      return;
    }
    var weaponKey = section.getAttribute("data-rql-weapon");
    var nodeId = cell.getAttribute("data-rql-node-id");
    if (!weaponKey || !nodeId) {
      return;
    }
    var weapon = masteryDataCache && masteryDataCache[weaponKey];
    if (!weapon) {
      return;
    }
    e.preventDefault();
    var ids = getWeaponNodes(weaponKey);
    var ix = ids.indexOf(nodeId);
    var next;
    if (ix !== -1) {
      next = pruneSelection(weapon, ids, nodeId);
    } else {
      if (!canAddSelection(weapon, nodeId, ids)) {
        return;
      }
      if (ids.length >= MASTERY_TITLE_TOTAL) {
        return;
      }
      next = ids.concat([nodeId]);
    }
    saveWeaponNodes(weaponKey, next);
    rerenderMasteryBodyFromCache();
  }

  function refreshMasteryBody() {
    var body = document.getElementById("rql-mastery-body");
    if (!body) {
      return;
    }
    body.innerHTML =
      '<div class="text-sm text-slate-400 text-center py-6">Загрузка…</div>';
    loadMasteryData().then(function (data) {
      var el = document.getElementById("rql-mastery-body");
      if (!el) {
        return;
      }
      el.innerHTML = buildMasteryMarkup(data || {});
      syncMasteryBonusesAttr();
      try {
        if (typeof window.__RQL_MASTERY.onTotalsRefresh === "function") {
          window.__RQL_MASTERY.onTotalsRefresh();
        }
      } catch (_e) {}
    });
  }

  function isNativeMasteryTabBtn(btn) {
    if (!btn || btn.nodeName !== "BUTTON") {
      return false;
    }
    if (btn.getAttribute("data-rql-mastery-btn") === "1") {
      return false;
    }
    if (!btn.querySelector('span[class*="sword-bold"]')) {
      return false;
    }
    var text = (btn.textContent || "").replace(/\s+/g, " ").trim();
    return text.indexOf("Mastery") !== -1;
  }

  function ensureStyles() {
    if (document.getElementById("rql-mastery-modal-style")) {
      return;
    }
    var s = document.createElement("style");
    s.id = "rql-mastery-modal-style";
    s.textContent =
      "#rql-mastery-overlay{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;padding:2.25rem 1.25rem;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);}" +
      "#rql-mastery-overlay[data-open=\"1\"]{display:flex;}" +
      "#rql-mastery-panel{max-width:min(960px,100%);max-height:min(90vh,920px);width:100%;min-height:0;overflow:hidden;display:flex;flex-direction:column;border-radius:5px;border:1px solid rgba(148,163,184,0.35);box-shadow:0 25px 50px -12px rgba(0,0,0,0.45);background:#111111;color:#e5e7eb;font-family:Figtree,ui-sans-serif,system-ui,sans-serif;}" +
      "#rql-mastery-body{flex:1;min-height:0;overflow:auto;padding:32px 20px 36px;font-size:0.92rem;line-height:1.4;-webkit-overflow-scrolling:touch;}" +
      "#rql-mastery-body .rql-mastery-weapon{margin-bottom:2.25rem;}" +
      "#rql-mastery-body .rql-mastery-weapon:last-child{margin-bottom:0;}" +
      "#rql-mastery-body .rql-mastery-weapon-title{font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#cbd5e1;text-align:center;margin:0 0 1rem;padding:0;line-height:1.25;}" +
      "#rql-mastery-body .rql-mastery-weapon-progress{font-weight:700;font-variant-numeric:tabular-nums;color:#94a3b8;margin-left:0.35em;}" +
      "#rql-mastery-body .rql-mastery-weapon-inner{display:flex;flex-direction:column;align-items:center;gap:0.95rem;width:100%;padding:0.65rem 0 0.85rem;}" +
      "#rql-mastery-body .rql-mastery-branch-row{display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;justify-content:center;gap:6px;padding:0 8px;width:100%;box-sizing:border-box;}" +
      "#rql-mastery-body .rql-mastery-row-lead{width:46px;min-width:46px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;}" +
      "#rql-mastery-body .rql-mastery-row-lead--empty{min-height:42px;}" +
      "#rql-mastery-body .rql-mastery-row-lead .rql-mastery-node-cell{width:100%;}" +
      "#rql-mastery-body .rql-mastery-node-cell{width:46px;min-width:46px;flex-shrink:0;box-sizing:border-box;}" +
      "#rql-mastery-body .rql-mastery-node-cell--grid-major{width:58px;min-width:58px;}" +
      "#rql-mastery-body .rql-mastery-node-cell--grid-major .rql-mastery-hex-outer{width:54px;height:54px;}" +
      "#rql-mastery-body .rql-mastery-node{position:relative;display:flex;justify-content:center;align-items:center;}" +
      "#rql-mastery-body .rql-mastery-hit{-webkit-appearance:none;appearance:none;border:0;padding:0;margin:0;background:transparent!important;background-color:transparent!important;color:transparent!important;font-size:0;line-height:0;box-shadow:none;}" +
      "#rql-mastery-body .rql-mastery-hit:active{background:transparent!important;background-color:transparent!important;}" +
      "#rql-mastery-body .rql-mastery-node-cell[data-rql-node-id] .rql-mastery-hit{cursor:pointer;}" +
      "#rql-mastery-body .rql-mastery-node-cell--locked .rql-mastery-hit{cursor:not-allowed;}" +
      "#rql-mastery-body .rql-mastery-node-cell[data-rql-node-id]:not(.rql-mastery-node-cell--selected) .rql-mastery-hex-outer{opacity:0.4;}" +
      "#rql-mastery-body .rql-mastery-node-cell--locked:not(.rql-mastery-node-cell--selected) .rql-mastery-hex-outer{opacity:0.25;}" +
      "#rql-mastery-body .rql-mastery-node-cell--selected .rql-mastery-hex-outer{opacity:1;box-shadow:0 0 16px 6px rgba(250,204,21,0.5);}" +
      "#rql-mastery-body .rql-mastery-hit:focus,#rql-mastery-body .rql-mastery-hit:focus-visible{outline:none!important;}" +
      "#rql-mastery-body .rql-mastery-hex-outer{display:flex;align-items:center;justify-content:center;width:42px;height:42px;padding:2px;box-sizing:border-box;background:#7b7b7d;}" +
      "#rql-mastery-body .rql-mastery-hex-inner{display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box;background:#272624;overflow:hidden;}" +
      "#rql-mastery-body .rql-mastery-hex-inner img{display:block;object-fit:contain;max-width:100%;max-height:100%;transform:scale(1.4);transform-origin:center center;}" +
      "#rql-mastery-body .rql-mastery-connector-slot{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:28px;min-width:28px;}" +
      "#rql-mastery-body .rql-mastery-connector-img{display:block;object-fit:contain;vertical-align:middle;opacity:0.95;}" +
      "#rql-mastery-body .rql-mastery-tooltip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);min-width:140px;max-width:240px;padding:8px 10px;background:#111111;border:1px solid #282828;border-radius:8px;font-size:11px;line-height:1.35;color:#e5e7eb;box-shadow:0 10px 28px rgba(0,0,0,.55);opacity:0;visibility:hidden;transition:opacity .1s ease,visibility .1s;z-index:20;pointer-events:none;text-align:left;}" +
      "#rql-mastery-body .rql-mastery-node:hover .rql-mastery-tooltip{opacity:1;visibility:visible;pointer-events:auto;}" +
      "#rql-mastery-body .rql-mastery-tip-title{font-weight:600;margin-bottom:6px;color:#f8fafc;font-size:12px;line-height:1.2;}" +
      "#rql-mastery-body .rql-mastery-tip-line{font-size:10px;margin-top:3px;color:#cbd5e1;}" +
      "#rql-mastery-body .rql-mastery-tip-k{opacity:0.85;}" +
      "#rql-mastery-body .rql-mastery-tip-v{font-variant-numeric:tabular-nums;}" +
      "#rql-mastery-panel .clip-hexagon{clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);}" +
      "#rql-mastery-panel img{max-width:none;vertical-align:middle;}" +
      "#rql-mastery-overlay button.rql-mastery-hit{background-image:none!important;}";
    document.head.appendChild(s);
  }

  function ensureOverlay() {
    var el = document.getElementById("rql-mastery-overlay");
    if (el) {
      return el;
    }
    ensureStyles();
    el = document.createElement("div");
    el.id = "rql-mastery-overlay";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div id="rql-mastery-panel" role="dialog" aria-modal="true" aria-label="Mastery">' +
      '<div id="rql-mastery-body"></div>' +
      "</div>";

    el.addEventListener("click", function (e) {
      if (e.target === el) {
        closeModal();
      }
    });

    var panel = el.querySelector("#rql-mastery-panel");
    if (panel) {
      panel.addEventListener("click", function (e) {
        onMasteryNodePickClick(e);
        e.stopPropagation();
      });
    }

    document.body.appendChild(el);
    return el;
  }

  function openModal() {
    var o = ensureOverlay();
    o.setAttribute("data-open", "1");
    o.setAttribute("aria-hidden", "false");
    try {
      document.body.style.overflow = "hidden";
    } catch (_e) {}
    refreshMasteryBody();
  }

  function closeModal() {
    var o = document.getElementById("rql-mastery-overlay");
    if (!o) {
      return;
    }
    o.removeAttribute("data-open");
    o.setAttribute("aria-hidden", "true");
    try {
      document.body.style.overflow = "";
    } catch (_e2) {}
  }

  function onDocKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
    }
  }

  function bindEscOnce() {
    if (document.documentElement.getAttribute("data-rql-mastery-esc") === "1") {
      return;
    }
    document.documentElement.setAttribute("data-rql-mastery-esc", "1");
    document.addEventListener("keydown", onDocKeydown);
  }

  function createRqlButton(templateBtn) {
    var ours = document.createElement("button");
    ours.type = "button";
    ours.setAttribute("data-rql-mastery-btn", "1");
    ours.className = templateBtn.className;
    ours.innerHTML = templateBtn.innerHTML;

    ours.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openModal();
      },
      true
    );

    return ours;
  }

  function syncReplaceMasteryTab() {
    var buttons = document.querySelectorAll('button[type="button"]');
    var i;
    for (i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (!isNativeMasteryTabBtn(btn)) {
        continue;
      }

      var prev = btn.previousElementSibling;
      if (prev && prev.getAttribute("data-rql-mastery-btn") === "1") {
        btn.style.setProperty("display", "none", "important");
        continue;
      }

      btn.style.setProperty("display", "none", "important");
      var ours = createRqlButton(btn);
      if (btn.parentNode) {
        btn.parentNode.insertBefore(ours, btn);
      }
    }
  }

  var pending = false;
  function scheduleSync() {
    if (pending) {
      return;
    }
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      syncReplaceMasteryTab();
    });
  }

  document.addEventListener("rql-mastery-equipment-changed", function () {
    loadMasteryData().then(function () {
      syncMasteryBonusesAttr();
    });
  });

  bindEscOnce();
  scheduleSync();

  var obs = new MutationObserver(scheduleSync);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  try {
    window.__RQL_MASTERY = {
      open: openModal,
      close: closeModal,
      onTotalsRefresh: null,
      getBodyEl: function () {
        return document.getElementById("rql-mastery-body");
      },
      reload: refreshMasteryBody,
      getWeaponNodesForWeapon: getWeaponNodes,
      getAggregatedMasteryBonuses: function () {
        return masteryDataCache
          ? normalizeMasteryTotals(aggregateMasteryBonuses(masteryDataCache))
          : {};
      },
      syncBonusesToDocument: syncMasteryBonusesAttr,
      getMasteryData: function () {
        return masteryDataCache;
      },
      detectWeapons: detectEquippedWeaponKeys,
    };
  } catch (_w) {}
})();
