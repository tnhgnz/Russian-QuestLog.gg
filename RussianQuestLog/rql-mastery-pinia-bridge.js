(function () {
  "use strict";
  var ATTR = "data-rql-weapon-keys";

  var WEAPON_DETECT = [
    { key: "shield", re: /shield|buckler/i },
    { key: "greatsword", re: /greatsword|great_sword|sword2h|sword_2h|2h.*sword|gargantuan.*sword/i },
    { key: "crossbow", re: /crossbow|cross_bow|arbalest/i },
    { key: "longbow", re: /longbow|long_bow|netherbow|tevent'?s.*arc.*wailing.*death/i },
    { key: "staff", re: /\/staff|_staff|staff\.webp|staff[^a-z]/i },
    { key: "wand", re: /\/wand|_wand|wand\.webp|wand[^a-z]/i },
    { key: "dagger", re: /dagger|dag_|knife/i },
    { key: "spear", re: /spear|polearm|halberd|ranseur|lance|pike|javelin|it_p_spear|weapon_spear|sw2/i },
  ];

  function classifyCombined(alt, src) {
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

    var i;
    for (i = 0; i < WEAPON_DETECT.length; i++) {
      if (WEAPON_DETECT[i].re.test(t)) {
        return WEAPON_DETECT[i].key;
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
    return classifyCombined(im.getAttribute("alt") || "", s);
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

  function syncAttr() {
    var keys = keysFromEquipmentGrid().slice(0, 2);
    try {
      if (keys.length > 0) {
        document.documentElement.setAttribute(ATTR, JSON.stringify(keys));
      } else {
        document.documentElement.removeAttribute(ATTR);
      }
    } catch (_e2) {}
    try {
      document.dispatchEvent(new CustomEvent("rql-mastery-equipment-changed"));
    } catch (_d) {}
  }

  syncAttr();
  var mo = new MutationObserver(function () {
    syncAttr();
  });
  try {
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_m) {}
  setInterval(syncAttr, 1000);
})();
