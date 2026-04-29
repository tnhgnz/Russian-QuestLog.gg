(function () {
  "use strict";

  var SESSION_DISMISS = "rql_outdated_banner_dismissed";
  var OVERLAY_ID = "rql-outdated-plugin-overlay";

  function mountOverlay(overlay) {
    var root = document.body || document.documentElement;
    try {
      root.appendChild(overlay);
    } catch (_e) {}
    if (!document.body) {
      window.addEventListener(
        "DOMContentLoaded",
        function once() {
          window.removeEventListener("DOMContentLoaded", once);
          try {
            if (
              overlay.isConnected &&
              overlay.parentNode !== document.body
            ) {
              document.body.appendChild(overlay);
            }
          } catch (_e2) {}
        },
        false
      );
    }
  }

  function dismissOverlay(overlay) {
    try {
      document.removeEventListener("keydown", overlay.__rqlEsc);
    } catch (_e) {}
    sessionStorage.setItem(SESSION_DISMISS, "1");
    overlay.remove();
  }

  function showBanner(info) {
    if (!info || !info.outdated) {
      return;
    }
    if (sessionStorage.getItem(SESSION_DISMISS) === "1") {
      return;
    }
    if (document.getElementById(OVERLAY_ID)) {
      return;
    }

    var overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "presentation");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483646",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:20px",
      "box-sizing:border-box",
      "background:rgba(0,0,0,0.82)",
      "backdrop-filter:blur(4px)",
      "-webkit-backdrop-filter:blur(4px)",
    ].join(";");

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        dismissOverlay(overlay);
      }
    });

    var bar = document.createElement("div");
    bar.setAttribute("role", "alertdialog");
    bar.setAttribute("aria-modal", "true");
    bar.setAttribute("aria-labelledby", "rql-outdated-plugin-title");
    bar.style.cssText = [
      "position:relative",
      "z-index:1",
      "max-width:min(520px,calc(100vw - 40px))",
      "width:100%",
      "box-sizing:border-box",
      "padding:18px 20px",
      "border-radius:14px",
      "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
      "font-size:15px",
      "line-height:1.5",
      "color:#f3f4f6",
      "background:rgb(22,22,22)",
      "border:1px solid rgb(40,40,40)",
      "box-shadow:0 24px 64px rgba(0,0,0,.55)",
      "display:flex",
      "flex-direction:column",
      "gap:14px",
    ].join(";");

    bar.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    var title = document.createElement("div");
    title.id = "rql-outdated-plugin-title";
    title.style.fontWeight = "700";
    title.style.fontSize = "16px";
    title.style.letterSpacing = "0.02em";
    title.textContent = "RussianQuestLog устарел";

    var text = document.createElement("div");
    text.style.opacity = "0.92";
    text.textContent =
      "У вас v" +
      (info.local || "?") +
      ", на GitHub уже v" +
      (info.remote || "?") +
      ". Скачайте свежую сборку с GitHub Releases.";

    var row = document.createElement("div");
    row.style.cssText =
      "display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:flex-end;margin-top:4px;";

    var link = document.createElement("a");
    link.href =
      info.releasesUrl ||
      "https://github.com/tnhgnz/Russian-QuestLog.gg/releases";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Открыть релизы";
    link.style.cssText =
      "color:#93c5fd;font-weight:600;text-decoration:none;white-space:nowrap;padding:8px 4px;";
    link.addEventListener("mouseenter", function () {
      link.style.textDecoration = "underline";
    });
    link.addEventListener("mouseleave", function () {
      link.style.textDecoration = "none";
    });

    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Скрыть";
    btn.style.cssText =
      "cursor:pointer;border:0;border-radius:10px;padding:10px 16px;background:#2d3348;color:#e5e7eb;font:inherit;font-weight:600;";
    btn.addEventListener("click", function () {
      dismissOverlay(overlay);
    });

    overlay.__rqlEsc = function (e) {
      if (e.key === "Escape") {
        dismissOverlay(overlay);
      }
    };
    document.addEventListener("keydown", overlay.__rqlEsc);

    row.appendChild(link);
    row.appendChild(btn);
    bar.appendChild(title);
    bar.appendChild(text);
    bar.appendChild(row);
    overlay.appendChild(bar);
    mountOverlay(overlay);
  }

  chrome.runtime.sendMessage({ type: "rql_query_outdated" }, function (res) {
    if (chrome.runtime.lastError || !res || !res.ok || !res.outdated) {
      return;
    }
    showBanner(res);
  });
})();
