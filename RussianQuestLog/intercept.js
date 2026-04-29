(function () {
  "use strict";

  var MAX_GRADE = 41;
  var FORBIDDEN_GRADES = [32, 11];
  var ID_ORB_MARKER = "orb_";

  try {
    if (typeof window.__rqlArmorWeight === "undefined") {
      window.__rqlArmorWeight = "all";
    }
    if (typeof window.__rqlArmorSlot === "undefined") {
      window.__rqlArmorSlot = "";
    }
  } catch (_i) {}

  function armorSlotAllowsWeightFilter() {
    try {
      var s = String(window.__rqlArmorSlot || "").toLowerCase();
      if (!s) {
        return false;
      }
      return (
        s === "head" ||
        s === "chest" ||
        s === "hands" ||
        s === "legs" ||
        s === "feet"
      );
    } catch (_e) {
      return false;
    }
  }

  function getArmorWeightFilter() {
    try {
      var v = window.__rqlArmorWeight;
      if (v === "cloth" || v === "leather" || v === "plate" || v === "all") {
        return v;
      }
    } catch (_e) {}
    return "all";
  }

  function looksLikeArmorItem(item) {
    if (!item || typeof item !== "object") {
      return false;
    }
    if (
      typeof item.mainCategory === "string" &&
      item.mainCategory.toLowerCase() === "armor"
    ) {
      return true;
    }
    if (typeof item.subCategory === "string") {
      var sc = item.subCategory.toLowerCase();
      if (
        sc === "head" ||
        sc === "hands" ||
        sc === "chest" ||
        sc === "legs" ||
        sc === "feet" ||
        sc === "shoulders" ||
        sc === "waist" ||
        sc === "back" ||
        sc === "neck" ||
        sc === "earring" ||
        sc === "brooch" ||
        sc === "ring" ||
        sc === "bracelet"
      ) {
        return true;
      }
    }
    var id = typeof item.id === "string" ? item.id.toLowerCase() : "";
    return /^(hands|head|chest|legs|feet|shoulders|waist|back|neck|earring|brooch|ring|bracelet)_/.test(
      id
    );
  }

  function armorWeightKindFromStrings(low) {
    if (low.indexOf("leather_") !== -1 || low.indexOf("_leather") !== -1) {
      return "leather";
    }
    if (low.indexOf("plate_") !== -1 || low.indexOf("_plate") !== -1) {
      return "plate";
    }
    if (low.indexOf("fabric_") !== -1 || low.indexOf("_fabric") !== -1) {
      return "cloth";
    }
    return null;
  }

  function passesArmorWeightFilter(item) {
    if (!armorSlotAllowsWeightFilter()) {
      return true;
    }
    if (!looksLikeArmorItem(item)) {
      return true;
    }
    var f = getArmorWeightFilter();
    if (f === "all") {
      return true;
    }
    var id = typeof item.id === "string" ? item.id.toLowerCase() : "";
    var cp =
      typeof item.compoundId === "string" ? item.compoundId.toLowerCase() : "";
    var low = id + " " + cp;
    var w = armorWeightKindFromStrings(low);
    if (!w) {
      return true;
    }
    return w === f;
  }

  function passesOrbIdRule(item) {
    if (!item || typeof item !== "object") {
      return false;
    }
    var keys = ["id", "compoundId"];
    for (var k = 0; k < keys.length; k++) {
      var s = item[keys[k]];
      if (typeof s !== "string") {
        continue;
      }
      if (s.indexOf(ID_ORB_MARKER) !== -1) {
        return false;
      }
    }
    return true;
  }

  function passesGradeRule(item) {
    if (!item || typeof item !== "object") {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(item, "grade")) {
      return true;
    }
    var g = Number(item.grade);
    if (isNaN(g)) {
      return true;
    }
    if (FORBIDDEN_GRADES.indexOf(g) !== -1) {
      return false;
    }
    return g <= MAX_GRADE;
  }

  function looksLikeGameItem(val) {
    if (!val || typeof val !== "object" || Array.isArray(val)) {
      return false;
    }
    if (typeof val.id === "string" && val.id.length > 0) {
      return true;
    }
    if (typeof val.compoundId === "string" && val.compoundId.length > 0) {
      return true;
    }
    return false;
  }

  function excludePageDataItem(item) {
    return (
      !item ||
      !passesGradeRule(item) ||
      !passesOrbIdRule(item) ||
      !passesArmorWeightFilter(item)
    );
  }

  function excludeNestedGameItem(item) {
    if (!passesOrbIdRule(item)) {
      return true;
    }
    if (!passesGradeRule(item)) {
      return true;
    }
    if (!passesArmorWeightFilter(item)) {
      return true;
    }
    return false;
  }

  function visit(node, arrayParentKey) {
    if (node === null || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      var pageDataMode = arrayParentKey === "pageData";
      for (var i = node.length - 1; i >= 0; i--) {
        var el = node[i];
        if (pageDataMode) {
          if (excludePageDataItem(el)) {
            node.splice(i, 1);
          } else {
            visit(el, null);
          }
        } else {
          if (looksLikeGameItem(el) && excludeNestedGameItem(el)) {
            node.splice(i, 1);
          } else {
            visit(el, null);
          }
        }
      }
      return;
    }
    for (var key in node) {
      if (!Object.prototype.hasOwnProperty.call(node, key)) {
        continue;
      }
      var val = node[key];
      if (val === null || typeof val !== "object") {
        continue;
      }
      if (Array.isArray(val)) {
        visit(val, key);
      } else {
        if (looksLikeGameItem(val) && excludeNestedGameItem(val)) {
          delete node[key];
        } else {
          visit(val, null);
        }
      }
    }
  }

  function syncFacetDistribution(data) {
    var filtered = data.pageData;
    if (!Array.isArray(filtered)) {
      return;
    }
    var fd = data.facetDistribution;
    if (!fd || typeof fd !== "object") {
      return;
    }
    if (fd.grade && typeof fd.grade === "object") {
      var grades = {};
      for (var i = 0; i < filtered.length; i++) {
        var g = String(filtered[i].grade);
        grades[g] = (grades[g] || 0) + 1;
      }
      fd.grade = grades;
    }
  }

  function filterApiJson(json) {
    try {
      visit(json, null);
      var data = json && json.result && json.result.data;
      if (data) {
        syncFacetDistribution(data);
      }
      return json;
    } catch (_e) {
      return json;
    }
  }

  function looksLikeJsonContentType(ct) {
    return typeof ct === "string" && ct.indexOf("application/json") !== -1;
  }

  var originalFetch = window.fetch;
  window.fetch = function fetchFiltered() {
    var args = arguments;
    return originalFetch.apply(this, args).then(function (response) {
      var ct = response.headers.get("content-type") || "";
      if (!looksLikeJsonContentType(ct) || response.status === 204) {
        return response;
      }
      return response
        .clone()
        .text()
        .then(function (text) {
          try {
            var parsed = JSON.parse(text);
            filterApiJson(parsed);
            return new Response(JSON.stringify(parsed), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          } catch (_e) {
            return response;
          }
        });
    });
  };

  var XHR = XMLHttpRequest.prototype;
  var originalOpen = XHR.open;
  var originalSend = XHR.send;

  XHR.open = function (method, url) {
    this.__filterUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XHR.send = function () {
    var xhr = this;
    xhr.addEventListener(
      "readystatechange",
      function onReady() {
        if (xhr.readyState !== 4) {
          return;
        }
        xhr.removeEventListener("readystatechange", onReady);
        try {
          var ct = xhr.getResponseHeader("content-type") || "";
          if (!looksLikeJsonContentType(ct)) {
            return;
          }
          var rt = xhr.responseType;
          if (rt && rt !== "text" && rt !== "") {
            return;
          }
          var text = xhr.responseText;
          if (!text) {
            return;
          }
          var parsed = JSON.parse(text);
          filterApiJson(parsed);
          var out = JSON.stringify(parsed);
          try {
            Object.defineProperty(xhr, "responseText", {
              configurable: true,
              enumerable: true,
              writable: true,
              value: out,
            });
          } catch (_e1) {
            try {
              xhr.responseText = out;
            } catch (_e2) {}
          }
          if (rt === "" || rt === "text") {
            try {
              Object.defineProperty(xhr, "response", {
                configurable: true,
                enumerable: true,
                writable: true,
                value: out,
              });
            } catch (_e3) {}
          }
        } catch (_e) {}
      },
      false
    );
    return originalSend.apply(this, arguments);
  };
})();
