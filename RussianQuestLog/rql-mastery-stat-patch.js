(function () {
  "use strict";

  /**
   * Суммирует мастерку с текущим числом на странице (шмот + расчёт QuestLog).
   * Несколько чисел в одной строке (напр. два «%») — обрабатываются все span’ы.
   * Суффикс %: в span, в соседнем span, или по совпадению числа «%» и чисел в ячейке.
   * Храним: data-rql-mastery-add, data-rql-mastery-pct (если отображение в %).
   */

  function isInMasteryOverlay(el) {
    return !!(el && el.closest && el.closest("#rql-mastery-overlay"));
  }

  function statKeyToGuessLabel(key) {
    return key
      .split("_")
      .map(function (w) {
        return w.length
          ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          : "";
      })
      .join(" ");
  }

  var LABEL_ALIASES = {
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
    str: ["Strength", "Str"],
    dex: ["Dexterity", "Dex"],
    wis: ["Wisdom", "Wis"],
    per: ["Perception", "Per"],
    int: ["Intelligence", "Int"]
  };

  function rowLabelText(row) {
    var kids = row.children;
    if (!kids || kids.length < 1) {
      return "";
    }
    var left = kids[0];
    var el =
      left.querySelector("p.truncate") ||
      left.querySelector("p.text-sm") ||
      left.querySelector("p") ||
      left;
    return ((el && el.textContent) || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function rowMatchesStatKey(row, statKey) {
    var label = rowLabelText(row);
    if (!label) {
      return false;
    }
    var low = label.toLowerCase();
    var guess = statKeyToGuessLabel(statKey).toLowerCase();
    if (guess && low.indexOf(guess) !== -1) {
      return true;
    }
    var aliases = LABEL_ALIASES[statKey];
    if (aliases) {
      var i;
      for (i = 0; i < aliases.length; i++) {
        if (low.indexOf(aliases[i].toLowerCase()) !== -1) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Учитывает десятичную запятую (RU/EU) и форматы вроде 1.234,56 / 1,234.56.
   * Раньше все запятые выкидывались — «12,5» превращалось в 125.
   */
  function parseNum(s) {
    if (s == null || s === "") {
      return NaN;
    }
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
    if (!m) {
      return NaN;
    }
    var n = parseFloat(m[0]);
    return isNaN(n) ? NaN : n;
  }

  /** Не обрезать до одного знака — иначе ломается сумма с дробным статом/мастеркой. */
  function formatNum(n) {
    if (typeof n !== "number" || !isFinite(n)) {
      return "0";
    }
    var r = Math.round(n * 1e6) / 1e6;
    if (Math.abs(r - Math.round(r)) < 1e-7) {
      return String(Math.round(r));
    }
    var t = r.toFixed(6);
    t = t.replace(/(\.\d*?)0+$/, "$1");
    if (t.charAt(t.length - 1) === ".") {
      t = t.slice(0, -1);
    }
    return t;
  }

  function serializeBonus(b) {
    if (typeof b !== "number" || !isFinite(b)) {
      return "0";
    }
    return String(Math.round(b * 1e6) / 1e6);
  }

  /**
   * Все leaf-span’ы в правой колонке с парсящимся числом (порядок DOM слева направо).
   * Строки вроде «Mana Cost Efficiency» с двумя «2%» требуют патча каждого span’а.
   */
  function findValueSpans(row) {
    var kids = row.children;
    if (!kids || kids.length < 2) {
      return [];
    }
    var rightCol = kids[kids.length - 1];
    if (isInMasteryOverlay(rightCol)) {
      return [];
    }
    var spans = rightCol.querySelectorAll("span");
    var out = [];
    var i;
    for (i = 0; i < spans.length; i++) {
      var sp = spans[i];
      if (sp.childElementCount > 0) {
        continue;
      }
      if (isInMasteryOverlay(sp)) {
        continue;
      }
      var t = (sp.textContent || "").trim();
      if (!t) {
        continue;
      }
      var n = parseNum(t);
      if (isNaN(n)) {
        continue;
      }
      out.push(sp);
    }
    return out;
  }

  /**
   * Процент в своём span; или отдельный span «%» сразу после; или столько «%» в колонке,
   * сколько числовых span’ов (напр. два «2%» в двух span’ах).
   */
  function inferPercentForSpan(sp, rightCol, numericSpans) {
    var t = (sp.textContent || "").trim();
    if (/%/.test(t)) {
      return true;
    }
    var sib = sp.nextElementSibling;
    if (sib) {
      var st = (sib.textContent || "").replace(/\s/g, "");
      if (st === "%" || st.indexOf("%") === 0) {
        return true;
      }
    }
    var full = (rightCol.textContent || "").replace(/\s/g, "");
    var pm = full.match(/%/g);
    var pctCount = pm ? pm.length : 0;
    if (
      pctCount > 0 &&
      numericSpans &&
      numericSpans.length > 0 &&
      pctCount === numericSpans.length
    ) {
      return true;
    }
    return false;
  }

  /** Убрать наш бонус с числа (вернуть то, что даёт страница без мастерки). */
  function stripMasteryBonusFromSpan(sp) {
    if (!sp || isInMasteryOverlay(sp)) {
      return;
    }
    var addStr = sp.getAttribute("data-rql-mastery-add");
    if (addStr === null || addStr === "") {
      return;
    }
    var add = parseFloat(addStr);
    var isPct = sp.getAttribute("data-rql-mastery-pct") === "1";
    var live = parseNum(sp.textContent);
    sp.removeAttribute("data-rql-mastery-add");
    sp.removeAttribute("data-rql-mastery-key");
    sp.removeAttribute("data-rql-mastery-pct");
    if (isNaN(add) || isNaN(live)) {
      return;
    }
    var naked = live - add;
    if (naked >= -1e-6) {
      var v = formatNum(Math.max(0, naked));
      sp.textContent = isPct ? v + "%" : v;
    }
  }

  function clearAllPatches() {
    var nodes = document.querySelectorAll("[data-rql-mastery-add]");
    var i;
    for (i = 0; i < nodes.length; i++) {
      stripMasteryBonusFromSpan(nodes[i]);
    }
  }

  /**
   * Текущее «сырое» значение от билдера (после strip), без добавления бонуса.
   */
  function readGearStat(valSpan) {
    stripMasteryBonusFromSpan(valSpan);
    return parseNum(valSpan.textContent);
  }

  function applyRowBonus(row, statKey, bonus) {
    if (isInMasteryOverlay(row) || row.children.length < 2) {
      return;
    }
    var rightCol = row.children[row.children.length - 1];
    var valSpans = findValueSpans(row);
    if (!valSpans.length) {
      return;
    }
    var vi;
    for (vi = 0; vi < valSpans.length; vi++) {
      var valSpan = valSpans[vi];
      var gear = readGearStat(valSpan);
      if (isNaN(gear)) {
        continue;
      }
      var isPct = inferPercentForSpan(valSpan, rightCol, valSpans);
      var sum = gear + bonus;
      var out = formatNum(sum);
      valSpan.textContent = isPct ? out + "%" : out;
      valSpan.setAttribute("data-rql-mastery-add", serializeBonus(bonus));
      valSpan.setAttribute("data-rql-mastery-key", statKey);
      if (isPct) {
        valSpan.setAttribute("data-rql-mastery-pct", "1");
      } else {
        valSpan.removeAttribute("data-rql-mastery-pct");
      }
    }
  }

  function runPatch() {
    clearAllPatches();
    var raw = document.documentElement.getAttribute("data-rql-mastery-bonuses");
    var totals = {};
    if (raw) {
      try {
        totals = JSON.parse(raw);
      } catch (_e) {
        totals = {};
      }
    }
    var statKeys = Object.keys(totals);
    if (statKeys.length === 0) {
      return;
    }

    var rows = document.querySelectorAll(
      "div.justify-between.gap-2, div.justify-between.items-center, div.justify-between"
    );
    var usedRows = Object.create(null);
    var si;
    for (si = 0; si < statKeys.length; si++) {
      var sk = statKeys[si];
      var bonus = totals[sk];
      if (typeof bonus !== "number" || bonus === 0) {
        continue;
      }
      var ri;
      for (ri = 0; ri < rows.length; ri++) {
        if (usedRows[ri]) {
          continue;
        }
        var row = rows[ri];
        if (isInMasteryOverlay(row) || row.children.length < 2) {
          continue;
        }
        if (rowMatchesStatKey(row, sk)) {
          applyRowBonus(row, sk, bonus);
          usedRows[ri] = true;
          break;
        }
      }
    }
  }

  var debounceT = null;
  function schedulePatch() {
    if (debounceT) {
      clearTimeout(debounceT);
    }
    debounceT = setTimeout(function () {
      debounceT = null;
      try {
        runPatch();
      } catch (_e2) {}
    }, 120);
  }

  document.addEventListener("rql-mastery-bonuses-updated", schedulePatch);
  document.addEventListener("rql-mastery-equipment-changed", schedulePatch);

  try {
    new MutationObserver(schedulePatch).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-rql-mastery-bonuses"],
      subtree: false
    });
  } catch (_m) {}

  /** Vue обновил текст статов (шмот, пересчёт) — пересуммировать. */
  var nuxt = document.getElementById("__nuxt") || document.body;
  try {
    new MutationObserver(function () {
      schedulePatch();
    }).observe(nuxt, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: false
    });
  } catch (_n) {}

  setInterval(schedulePatch, 2500);
  schedulePatch();
})();
