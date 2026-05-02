(function () {
  "use strict";

  var ROW_SEL =
    "div.justify-between.gap-2, div.justify-between.items-center, div.justify-between";
  var LABELS = {
    main_max_damage: ["Main Weapon Attack", "Main Attack", "Main Hand"],
    skill_damage: ["Skill Damage", "Skill Attack"],
    melee_hit: ["Melee Hit"],
    magic_hit: ["Magic Hit"],
    ranged_hit: ["Ranged Hit"],
    max_health: ["Max Health"],
    max_mana: ["Max Mana"],
    health_regen: ["Health Regen", "Health Recovery"],
    mana_regen: ["Mana Regen", "Mana Recovery"],
    melee_defense: ["Melee Defense"],
    ranged_defense: ["Ranged Defense"],
    magic_defense: ["Magic Defense"],
    damage_bonus: ["Damage Bonus"],
    damage_reduction: ["Damage Reduction"],
    move_speed_bonus: ["Move Speed"],
    off_hand_weapon_attack_chance_bonus: [
      "Off-Hand Weapon Attack Chance",
      "Off Hand Weapon Attack Chance"
    ],
    str: ["Strength", "Str"],
    dex: ["Dexterity", "Dex"],
    wis: ["Wisdom", "Wis"],
    per: ["Perception", "Per"],
    int: ["Intelligence", "Int"]
  };

  function inOverlay(el) {
    return !!(el && el.closest && el.closest("#rql-mastery-overlay"));
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
    if (!kids || !kids.length) return "";
    var L = kids[0];
    var el =
      L.querySelector("span[class*='truncate']") ||
      L.querySelector("span.truncate") ||
      L.querySelector("p.truncate") ||
      L.querySelector("p.text-sm") ||
      L.querySelector("p") ||
      L;
    return ((el && el.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function rowMatches(row, sk) {
    var lab = rowLabel(row);
    if (!lab) return false;
    var low = lab.toLowerCase();
    var g = guessLabel(sk).toLowerCase();
    if (g && low.indexOf(g) !== -1) return true;
    var al = LABELS[sk];
    if (!al) return false;
    var i;
    for (i = 0; i < al.length; i++) {
      if (low.indexOf(al[i].toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function parseNum(s) {
    if (s == null || s === "") return NaN;
    var t = String(s)
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, "")
      .replace(/%/g, "");
    var hasComma = t.indexOf(",") >= 0;
    var hasDot = t.indexOf(".") >= 0;
    if (hasComma && hasDot) {
      if (t.lastIndexOf(",") > t.lastIndexOf(".")) {
        t = t.replace(/\./g, "").replace(",", ".");
      } else {
        t = t.replace(/,/g, "");
      }
    } else if (hasComma && !hasDot) {
      var parts = t.split(",");
      if (
        parts.length === 2 &&
        parts[1].length <= 2 &&
        /^\d+$/.test(parts[0]) &&
        /^\d+$/.test(parts[1])
      ) {
        t = parts[0] + "." + parts[1];
      } else {
        t = t.replace(/,/g, "");
      }
    } else {
      t = t.replace(/,/g, "");
    }
    var m = t.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
    if (!m) return NaN;
    var n = parseFloat(m[0]);
    return isNaN(n) ? NaN : n;
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

  function valueSpans(row) {
    var kids = row.children;
    if (!kids || kids.length < 2) return [];
    var R = kids[kids.length - 1];
    if (inOverlay(R)) return [];
    var spans = R.querySelectorAll("span");
    var out = [];
    var i;
    for (i = 0; i < spans.length; i++) {
      var sp = spans[i];
      if (sp.childElementCount || inOverlay(sp)) continue;
      var tx = (sp.textContent || "").trim();
      if (!tx || isNaN(parseNum(tx))) continue;
      out.push(sp);
    }
    return out;
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
    var live = parseNum(sp.textContent);
    sp.removeAttribute("data-rql-mastery-add");
    sp.removeAttribute("data-rql-mastery-key");
    sp.removeAttribute("data-rql-mastery-pct");
    if (isNaN(add) || isNaN(live)) return;
    var naked = live - add;
    if (naked >= -1e-6) {
      var v = fmtNum(Math.max(0, naked));
      sp.textContent = pct ? v + "%" : v;
    }
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
    if (inOverlay(row) || row.children.length < 2) return;
    var rightCol = row.children[row.children.length - 1];
    var spans = valueSpans(row);
    if (!spans.length) return;
    var vi;
    for (vi = 0; vi < spans.length; vi++) {
      var sp = spans[vi];
      var g = gearNum(sp);
      if (isNaN(g)) continue;
      var pct = isPctSpan(sp, rightCol, spans);
      var sum = g + bonus;
      var out = fmtNum(sum);
      sp.textContent = pct ? out + "%" : out;
      sp.setAttribute("data-rql-mastery-add", serBonus(bonus));
      sp.setAttribute("data-rql-mastery-key", sk);
      if (pct) sp.setAttribute("data-rql-mastery-pct", "1");
      else sp.removeAttribute("data-rql-mastery-pct");
    }
    row.setAttribute("data-rql-stat-key", sk);
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

  function run() {
    clearPatches();
    clearStatKeys();
    syncTipClear();
    var totals = attrJSON("data-rql-mastery-bonuses") || {};
    var statKeys = Object.keys(totals);
    if (!statKeys.length) return;
    var rows = document.querySelectorAll(ROW_SEL);
    var used = Object.create(null);
    var si;
    for (si = 0; si < statKeys.length; si++) {
      var sk = statKeys[si];
      var bonus = totals[sk];
      if (typeof bonus !== "number" || bonus === 0 || isNaN(bonus)) continue;
      var ri;
      for (ri = 0; ri < rows.length; ri++) {
        if (used[ri]) continue;
        var row = rows[ri];
        if (inOverlay(row) || row.children.length < 2) continue;
        if (rowMatches(row, sk)) {
          patchRow(row, sk, bonus);
          used[ri] = true;
          break;
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
    new MutationObserver(sched).observe(nuxt, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: false
    });
  } catch (_n) {}

  setInterval(sched, 2500);
  sched();
})();
