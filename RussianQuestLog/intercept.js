(function () {
  "use strict";

  var ALLOWED_CREATED_AT = "2024-09-27";
  var MAX_GRADE = 41;

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
      item.createdAt !== ALLOWED_CREATED_AT ||
      !passesGradeRule(item)
    );
  }

  function excludeNestedGameItem(item) {
    if (!passesGradeRule(item)) {
      return true;
    }
    if (Object.prototype.hasOwnProperty.call(item, "createdAt")) {
      if (item.createdAt !== ALLOWED_CREATED_AT) {
        return true;
      }
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
    if (fd.createdAt && typeof fd.createdAt === "object") {
      var total = filtered.length;
      var createdBucket = {};
      if (total) {
        createdBucket[ALLOWED_CREATED_AT] = total;
      }
      fd.createdAt = createdBucket;
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
