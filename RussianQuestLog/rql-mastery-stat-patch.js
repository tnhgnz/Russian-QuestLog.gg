(function () {
  "use strict";

  var ROW_SEL =
    "div.justify-between.gap-2, div.justify-between.items-center, " +
    "div.justify-between[class*='border-t'], div[data-draggable='true'].justify-between, " +
    "div.justify-between";
  var LABELS = {
    main_max_damage: ["Main Weapon Attack", "Main Attack", "Main Hand"],
    skill_damage: ["Skill Damage", "Skill Attack"],
    melee_hit: ["Melee Hit", "Melee Hit Chance"],
    melee_critical_hit: ["Melee Critical Hit", "Melee Critical Hit Chance"],
    magic_hit: ["Magic Hit", "Magic Hit Chance"],
    ranged_hit: ["Ranged Hit", "Ranged Hit Chance"],
    max_health: [
      "Max Health",
      "Maximum Health",
      "Bonus Health",
      "Total Health",
      "Макс. здоровье",
      "Макс здоровье",
      "Максимум здоровья",
      "Максимальное здоровье",
      "Здоровье (макс.)",
      "Здоровье (макс)"
    ],
    max_mana: ["Max Mana", "Maximum Mana", "Макс. мана", "Максимум маны"],
    health_regen: ["Health Regen", "Health Recovery"],
    mana_regen: ["Mana Regen", "Mana Recovery"],
    melee_defense: ["Melee Defense"],
    ranged_defense: ["Ranged Defense"],
    magic_defense: ["Magic Defense"],
    damage_bonus: ["Damage Bonus", "Bonus Damage"],
    damage_reduction: ["Damage Reduction"],
    skill_damage_boost: ["Skill Damage Boost"],
    move_speed_bonus: [
      "Move Speed",
      "Movement Speed",
      "Скорость передвижения"
    ],
    off_hand_weapon_attack_chance_bonus: [
      "Off-Hand Weapon Attack Chance",
      "Off Hand Weapon Attack Chance"
    ],
    str: ["Strength", "Str"],
    dex: ["Dexterity", "Dex"],
    wis: ["Wisdom", "Wis"],
    per: ["Perception", "Per"],
    int: ["Intelligence", "Int"],
    cc_chance: ["CC Chance"],
    shield_block_chance_penetration: [
      "Shield Block Penetration",
      "Block Penetration"
    ],
    melee_endurance: ["Melee Endurance"],
    ranged_endurance: ["Ranged Endurance"],
    magic_endurance: ["Magic Endurance"],
    buff_duration: ["Buff Duration", "Длительность усиления"],
    debuff_duration: [
      "Debuff Duration",
      "Debuffs Duration",
      "Длительность ослабления",
      "Длительность дебаффов"
    ],
    melee_evasion: [
      "Melee Evasion",
      "Уклонение в ближнем бою"
    ],
    ranged_evasion: [
      "Ranged Evasion",
      "Уклонение в дальнем бою"
    ],
    magic_evasion: [
      "Magic Evasion",
      "Магическое уклонение"
    ],
    stun_chance: ["Stun Chance"],
    fear_chance: ["Fear Chance"],
    bind_chance: ["Bind Chance"],
    petrification_chance: ["Petrification Chance"],
    sleep_chance: ["Sleep Chance"],
    collision_chance: ["Collision Chance"],
    silence_chance: ["Silence Chance"],
    weaken_chance: ["Weaken Chance"]
  };

  function inOverlay(el) {
    return !!(el && el.closest && el.closest("#rql-mastery-overlay"));
  }

  function inBlockedPatch(el) {
    return !!(
      el &&
      el.closest &&
      (el.closest("#rql-mastery-overlay") || el.closest("button"))
    );
  }

  function guessLabel(key) {
    return key
      .split("_")
      .map(function (w) {
        return w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "";
      })
      .join(" ");
  }

  function rowLabel(row) {
    var kids = row.children;
    if (!kids || kids.length < 2) return "";
    var parts = [];
    var ci;
    for (ci = 0; ci < kids.length - 1; ci++) {
      var cell = kids[ci];
      if (!cell || inBlockedPatch(cell)) continue;
      var el =
        cell.querySelector("span[class*='truncate']") ||
        cell.querySelector("span.truncate") ||
        cell.querySelector("p.truncate") ||
        cell.querySelector("p.text-sm") ||
        cell.querySelector("p") ||
        null;
      var t = (
        (el && el.textContent) ||
        (cell.textContent || "")
      )
        .replace(/\s+/g, " ")
        .trim();
      if (t) parts.push(t);
    }
    return parts.join(" ").trim();
  }

  function normLabel(s) {
    return String(s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function labelEquals(lab, cand) {
    return normLabel(lab) === normLabel(cand);
  }

  function normalizeNumRaw(s) {
    return String(s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\u202F/g, " ")
      .replace(/\u2007/g, " ")
      .replace(/\u2008/g, " ")
      .replace(/\u2009/g, " ")
      .replace(/\u2060/g, "")
      .replace(/\uFEFF/g, "");
  }

  function numericLeafSpans(root) {
    var out = [];
    if (!root || inBlockedPatch(root)) return out;
    var all = root.querySelectorAll("span, div, p");
    var i;
    for (i = 0; i < all.length; i++) {
      var sp = all[i];
      if (inBlockedPatch(sp) || sp.childElementCount) continue;
      var tx = normalizeNumRaw(sp.textContent).replace(/\s+/g, " ").trim();
      if (!tx || isNaN(parseNum(tx))) continue;
      out.push(sp);
    }
    if (!out.length && !root.childElementCount) {
      var rt = normalizeNumRaw(root.textContent).replace(/\s+/g, " ").trim();
      if (rt && !isNaN(parseNum(rt))) {
        out.push(root);
      }
    }
    return out;
  }

  function valueSpans(row) {
    var kids = row.children;
    if (!kids || kids.length < 2) return [];
    var R = kids[kids.length - 1];
    if (inBlockedPatch(R)) return [];
    return numericLeafSpans(R);
  }

  function rowLooksDebuffDuration(lab, low) {
    if (/debuff/i.test(lab)) return true;
    if (/ослабл/i.test(low) || low.indexOf("дебаф") !== -1) return true;
    return false;
  }

  function rowMatches(row, sk) {
    var lab = rowLabel(row);
    if (!lab) return false;
    var low = lab.toLowerCase();
    if (sk === "buff_duration") {
      if (/debuff/i.test(lab)) return false;
      if (/ослабл/i.test(low) || low.indexOf("дебаф") !== -1) return false;
    }
    var g = guessLabel(sk);
    if (g && labelEquals(lab, g)) {
      if (sk === "buff_duration" && /debuff/i.test(lab)) return false;
      if (sk === "buff_duration" && (/ослабл/i.test(low) || low.indexOf("дебаф") !== -1)) {
        return false;
      }
      if (sk === "debuff_duration" && !rowLooksDebuffDuration(lab, low)) return false;
      return true;
    }
    var al = LABELS[sk];
    if (!al) return false;
    var i;
    for (i = 0; i < al.length; i++) {
      if (labelEquals(lab, al[i])) {
        if (sk === "buff_duration" && /debuff/i.test(lab)) continue;
        if (sk === "buff_duration" && (/ослабл/i.test(low) || low.indexOf("дебаф") !== -1)) {
          continue;
        }
        if (sk === "debuff_duration" && !rowLooksDebuffDuration(lab, low)) continue;
        return true;
      }
    }
    return false;
  }

  function parseNum(s) {
    if (s == null || s === "") return NaN;
    var raw = normalizeNumRaw(s).replace(/\s+/g, "").replace(/%/g, "");
    var m = raw.match(/-?[\d.,]+(?:e[+-]?\d+)?/i);
    if (!m) return NaN;
    var t = m[0];
    var exp = "";
    var em = t.match(/(e[+-]?\d+)$/i);
    if (em) {
      exp = em[1];
      t = t.slice(0, -exp.length);
    }
    var sign = "";
    if (t.charAt(0) === "-") {
      sign = "-";
      t = t.slice(1);
    }
    var lastComma = t.lastIndexOf(",");
    var lastDot = t.lastIndexOf(".");
    var decPos = Math.max(lastComma, lastDot);
    if (decPos >= 0) {
      var intPart = t.slice(0, decPos).replace(/[.,]/g, "");
      var fracPart = t.slice(decPos + 1).replace(/[.,]/g, "");
      t = sign + intPart + "." + fracPart + exp;
    } else {
      t = sign + t.replace(/[.,]/g, "") + exp;
    }
    var n = parseFloat(t);
    return isNaN(n) ? NaN : n;
  }

  function numNear(a, b) {
    if (
      typeof a !== "number" ||
      typeof b !== "number" ||
      !isFinite(a) ||
      !isFinite(b)
    ) {
      return false;
    }
    var d = Math.abs(a - b);
    if (d < 1e-4) return true;
    var s = Math.max(Math.abs(a), Math.abs(b), 1e-6);
    return d / s < 1e-6;
  }

  function fmtNum(n) {
    if (typeof n !== "number" || !isFinite(n)) return "0";
    var r = Math.round(n * 1e6) / 1e6;
    if (Math.abs(r - Math.round(r)) < 1e-7) return String(Math.round(r));
    var t = r.toFixed(6).replace(/(\.\d*?)0+$/, "$1");
    if (t.charAt(t.length - 1) === ".") t = t.slice(0, -1);
    return t;
  }

  function serBonus(b) {
    if (typeof b !== "number" || !isFinite(b)) return "0";
    return String(Math.round(b * 1e6) / 1e6);
  }

  function isPctSpan(sp, rightCol, numericSpans) {
    var t = (sp.textContent || "").trim();
    if (/%/.test(t)) return true;
    var sib = sp.nextElementSibling;
    if (sib) {
      var st = (sib.textContent || "").replace(/\s/g, "");
      if (st === "%" || st.indexOf("%") === 0) return true;
    }
    var full = (rightCol.textContent || "").replace(/\s/g, "");
    var pm = full.match(/%/g);
    var n = pm ? pm.length : 0;
    return (
      n > 0 &&
      numericSpans &&
      numericSpans.length &&
      n === numericSpans.length
    );
  }

  function stripBonus(sp) {
    if (!sp || inOverlay(sp)) return;
    var addStr = sp.getAttribute("data-rql-mastery-add");
    if (addStr == null || addStr === "") return;
    var add = parseFloat(addStr);
    var pct = sp.getAttribute("data-rql-mastery-pct") === "1";
    var baseStr = sp.getAttribute("data-rql-mastery-base");
    var live = parseNum(sp.textContent);
    var base = parseFloat(baseStr);
    sp.removeAttribute("data-rql-mastery-add");
    sp.removeAttribute("data-rql-mastery-key");
    sp.removeAttribute("data-rql-mastery-pct");
    sp.removeAttribute("data-rql-mastery-base");
    if (isNaN(add)) return;
    var naked;
    if (!isNaN(base) && !isNaN(live) && numNear(live, base + add)) {
      naked = base;
    } else if (!isNaN(live)) {
      naked = live;
    } else if (!isNaN(base)) {
      naked = base;
    } else {
      return;
    }
    var v = fmtNum(naked);
    sp.textContent = pct ? v + "%" : v;
  }

  function clearPatches() {
    var nodes = document.querySelectorAll("[data-rql-mastery-add]");
    var i;
    for (i = 0; i < nodes.length; i++) stripBonus(nodes[i]);
  }

  function gearNum(sp) {
    stripBonus(sp);
    return parseNum(sp.textContent);
  }

  function patchRow(row, sk, bonus) {
    if (inBlockedPatch(row) || row.children.length < 2) return false;
    var rightCol = row.children[row.children.length - 1];
    var spans = valueSpans(row);
    if (!spans.length) return false;
    var appliedBonus = bonus;
    var appliedStr = serBonus(appliedBonus);
    var patched = false;
    var vi;
    for (vi = 0; vi < spans.length; vi++) {
      var sp = spans[vi];
      var baseStr = sp.getAttribute("data-rql-mastery-base");
      var g = parseFloat(baseStr);
      if (isNaN(g)) {
        g = gearNum(sp);
      }
      if (isNaN(g)) continue;
      var pct = isPctSpan(sp, rightCol, spans);
      var sum = g + appliedBonus;
      var out = fmtNum(sum);
      sp.textContent = pct ? out + "%" : out;
      sp.setAttribute("data-rql-mastery-add", appliedStr);
      sp.setAttribute("data-rql-mastery-base", serBonus(g));
      sp.setAttribute("data-rql-mastery-key", sk);
      if (pct) sp.setAttribute("data-rql-mastery-pct", "1");
      else sp.removeAttribute("data-rql-mastery-pct");
      patched = true;
    }
    if (patched) {
      row.setAttribute("data-rql-stat-key", sk);
    }
    return patched;
  }

  function clearStatKeys() {
    var m = document.querySelectorAll("[data-rql-stat-key]");
    var i;
    for (i = 0; i < m.length; i++) {
      if (!inOverlay(m[i])) m[i].removeAttribute("data-rql-stat-key");
    }
  }

  function rmTipLines() {
    var nodes = document.querySelectorAll("[data-rql-mastery-tip-line]");
    var ni;
    for (ni = nodes.length - 1; ni >= 0; ni--) {
      var x = nodes[ni];
      if (x.parentNode) x.parentNode.removeChild(x);
    }
  }

  function attrJSON(name) {
    var raw = document.documentElement.getAttribute(name);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  function bonusFor(sk) {
    var t = attrJSON("data-rql-mastery-bonuses");
    if (!t || !sk) return 0;
    var v = t[sk];
    return typeof v === "number" && !isNaN(v) ? v : 0;
  }

  function iconFor(sk) {
    var t = attrJSON("data-rql-mastery-stat-icons");
    if (!t || !sk) return "";
    var u = t[sk];
    return typeof u === "string" ? u : "";
  }

  function wpnLbl(sk) {
    var t = attrJSON("data-rql-mastery-stat-weapon-types");
    if (!t || !sk) return "";
    var x = t[sk];
    return typeof x === "string" ? x : "";
  }

  function rowIsPct(row) {
    return !!(row && row.querySelector('[data-rql-mastery-pct="1"]'));
  }

  function statFromTip(shell) {
    var text = (shell.innerText || shell.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!text) return null;
    var totals = attrJSON("data-rql-mastery-bonuses");
    if (!totals) return null;
    var bestKey = null;
    var bestLen = 0;
    var keys = Object.keys(totals);
    var ki;
    for (ki = 0; ki < keys.length; ki++) {
      var sk = keys[ki];
      var b = totals[sk];
      if (typeof b !== "number" || b === 0 || isNaN(b)) continue;
      var cands = [];
      var al = LABELS[sk];
      if (al) {
        var ai;
        for (ai = 0; ai < al.length; ai++) cands.push(al[ai].toLowerCase());
      }
      var gu = guessLabel(sk).toLowerCase();
      if (gu) cands.push(gu);
      var ci;
      for (ci = 0; ci < cands.length; ci++) {
        var c = cands[ci];
        if (!c || text.indexOf(c) === -1) continue;
        if (
          bestKey === null ||
          c.length > bestLen ||
          (c.length === bestLen && sk.localeCompare(bestKey) < 0)
        ) {
          bestLen = c.length;
          bestKey = sk;
        }
      }
    }
    return bestKey;
  }

  function rowForStat(sk) {
    if (!sk) return null;
    var esc = sk.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    try {
      var el = document.querySelector('[data-rql-stat-key="' + esc + '"]');
      if (el && !inOverlay(el)) return el;
    } catch (_q) {}
    var rows = document.querySelectorAll(ROW_SEL);
    var ri;
    for (ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      if (inOverlay(row) || row.children.length < 2) continue;
      if (rowMatches(row, sk)) return row;
    }
    return null;
  }

  function tipShell(from) {
    var w = from;
    var d = 0;
    while (w && d < 55) {
      var cs = window.getComputedStyle(w);
      var r = w.getBoundingClientRect();
      if (
        (cs.position === "fixed" || cs.position === "absolute") &&
        r.width >= 72 &&
        r.height >= 20
      ) {
        if (
          w.querySelector("div.grid.grid-cols-1") ||
          w.querySelector("div[class*='grid'][class*='grid-cols-1']")
        ) {
          return w;
        }
      }
      w = w.parentElement;
      d++;
    }
    return null;
  }

  function bonusGrid(shell) {
    if (!shell) return null;
    return (
      shell.querySelector("div.grid.grid-cols-1") ||
      shell.querySelector("div[class*='grid'][class*='grid-cols-1']")
    );
  }

  function gridTpl(grid) {
    var rows = grid.querySelectorAll("div.flex.items-center.justify-between");
    if (!rows.length) {
      rows = grid.querySelectorAll(
        "div[class*='justify-between'][class*='items-center']"
      );
    }
    var i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute("data-rql-mastery-tip-line") !== "1") {
        return rows[i];
      }
    }
    return null;
  }

  function fillStripe(row, bonus, pct, sk) {
    var label =
      row.querySelector("span[class*='max-w'][class*='truncate']") ||
      row.querySelector("span.truncate") ||
      row.querySelector("span[class*='truncate']");
    var val =
      row.querySelector("span[class*='tabular-nums']") ||
      row.querySelector("span.font-semibold");
    if (label) {
      var wl = sk ? wpnLbl(sk) : "";
      label.textContent = wl ? "Mastery (" + wl + ")" : "Mastery";
    }
    var s = (bonus >= 0 ? "+" : "") + fmtNum(bonus) + (pct ? "%" : "");
    if (val) val.textContent = s;
    var url = sk ? iconFor(sk) : "";
    if (url && row.children.length >= 1) {
      var L = row.children[0];
      var img =
        (L.querySelector && L.querySelector("img[class*='z-10']")) ||
        L.querySelector("img");
      if (img) {
        img.setAttribute("src", url);
        img.style.display = "inline-block";
      }
    }
    row.setAttribute("data-rql-mastery-tip-line", "1");
  }

  function injectStripe(root) {
    if (!root || root.nodeType !== 1) return;
    var shell = tipShell(root);
    if (!shell || (shell.closest && shell.closest("#rql-mastery-overlay"))) {
      return;
    }
    var grid = bonusGrid(shell);
    if (!grid || grid.querySelector("[data-rql-mastery-tip-line]")) return;
    var ik = statFromTip(shell);
    var b = ik ? bonusFor(ik) : 0;
    if (!ik || !b) return;
    var tpl = gridTpl(grid);
    if (!tpl) return;
    var line = tpl.cloneNode(true);
    var statRow = rowForStat(ik);
    fillStripe(line, b, statRow && rowIsPct(statRow), ik);
    try {
      grid.appendChild(line);
    } catch (_e) {}
  }

  var lastSnap = null;

  function syncTipClear() {
    var snap =
      (document.documentElement.getAttribute("data-rql-mastery-bonuses") ||
        "") +
      "\n" +
      (document.documentElement.getAttribute("data-rql-mastery-stat-icons") ||
        "") +
      "\n" +
      (document.documentElement.getAttribute(
        "data-rql-mastery-stat-weapon-types"
      ) || "");
    if (snap !== lastSnap) {
      lastSnap = snap;
      rmTipLines();
    }
  }

  var tipT = null;
  try {
    new MutationObserver(function (recs) {
      if (tipT) clearTimeout(tipT);
      tipT = setTimeout(function () {
        tipT = null;
        var ri;
        for (ri = 0; ri < recs.length; ri++) {
          var rec = recs[ri];
          var ni;
          for (ni = 0; ni < rec.addedNodes.length; ni++) {
            var n = rec.addedNodes[ni];
            if (n.nodeType === 1) injectStripe(n);
          }
        }
      }, 0);
    }).observe(document.body, { childList: true, subtree: true });
  } catch (_m) {}

  var rqlMuteNuxtMutations = false;

  function sortStatKeysForPatch(keys) {
    var pri = {
      max_health: 0,
      max_mana: 1,
      melee_evasion: 2,
      ranged_evasion: 3,
      magic_evasion: 4,
    };
    return keys.slice().sort(function (a, b) {
      var pa = Object.prototype.hasOwnProperty.call(pri, a) ? pri[a] : 50;
      var pb = Object.prototype.hasOwnProperty.call(pri, b) ? pri[b] : 50;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
  }

  function rowLabelAllEvasion(row) {
    var lab = rowLabel(row);
    if (!lab) return false;
    var low = lab.toLowerCase();
    return (
      low.indexOf("all evasion") !== -1 ||
      low.indexOf("все уклонения") !== -1
    );
  }

  function run() {
    rqlMuteNuxtMutations = true;
    try {
      clearPatches();
      clearStatKeys();
      syncTipClear();
      var totals = attrJSON("data-rql-mastery-bonuses") || {};
      var statKeys = sortStatKeysForPatch(Object.keys(totals));
      if (!statKeys.length) {
        return;
      }
      var rows = document.querySelectorAll(ROW_SEL);
      var ri;

      var evasionSum =
        (totals.melee_evasion || 0) +
        (totals.ranged_evasion || 0) +
        (totals.magic_evasion || 0);
      var evasionConsumed = false;
      if (evasionSum !== 0 && !isNaN(evasionSum)) {
        for (ri = 0; ri < rows.length; ri++) {
          var rowAe = rows[ri];
          if (inBlockedPatch(rowAe) || rowAe.children.length < 2) continue;
          if (rowLabelAllEvasion(rowAe)) {
            if (patchRow(rowAe, "melee_evasion", evasionSum)) {
              evasionConsumed = true;
            }
          }
        }
      }

      var si;
      for (si = 0; si < statKeys.length; si++) {
        var sk = statKeys[si];
        var bonus = totals[sk];
        if (typeof bonus !== "number" || bonus === 0 || isNaN(bonus)) continue;
        if (
          evasionConsumed &&
          (sk === "melee_evasion" ||
            sk === "ranged_evasion" ||
            sk === "magic_evasion")
        ) {
          continue;
        }
        for (ri = 0; ri < rows.length; ri++) {
          var row = rows[ri];
          if (inBlockedPatch(row) || row.children.length < 2) continue;
          if (rowMatches(row, sk)) {
            patchRow(row, sk, bonus);
          }
        }
      }
    } finally {
      rqlMuteNuxtMutations = false;
    }
  }

  function nuxtPatchMutationSched(recs) {
    if (rqlMuteNuxtMutations) return;
    var i;
    for (i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (r.type === "childList") {
        sched();
        return;
      }
      if (r.type === "characterData") {
        var t = r.target;
        var p = t && t.parentElement;
        if (!p || !p.closest) continue;
        if (
          p.closest("div.justify-between.tabular-nums") ||
          p.closest("div[data-draggable='true'].justify-between") ||
          p.closest("div.justify-between[class*='border-t']")
        ) {
          sched();
          return;
        }
      }
    }
  }

  var debounceT = null;
  function sched() {
    if (debounceT) clearTimeout(debounceT);
    debounceT = setTimeout(function () {
      debounceT = null;
      try {
        run();
      } catch (_e) {}
    }, 120);
  }

  document.addEventListener("rql-mastery-bonuses-updated", sched);
  document.addEventListener("rql-mastery-equipment-changed", sched);

  try {
    new MutationObserver(sched).observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-rql-mastery-bonuses",
        "data-rql-mastery-stat-icons",
        "data-rql-mastery-stat-weapon-types"
      ],
      subtree: false
    });
  } catch (_m) {}

  var nuxt = document.getElementById("__nuxt") || document.body;
  try {
    new MutationObserver(nuxtPatchMutationSched).observe(nuxt, {
      subtree: true,
      childList: true,
      characterData: true
    });
  } catch (_n) {}

  sched();
})();
