(function () {
  "use strict";

  var RELEASES_API =
    "https://api.github.com/repos/tnhgnz/Russian-QuestLog.gg/releases/latest";
  var RELEASES_PAGE =
    "https://github.com/tnhgnz/Russian-QuestLog.gg/releases";
  var CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
  var ALARM_NAME = "rql_version_check";
  var ALARM_PERIOD_MIN = 24 * 60;
  var PAGE_CACHE_KEY = "rql_page_update_cache";
  var PAGE_CACHE_TTL_MS = 30 * 60 * 1000;
  var LEGACY_NOTIFY_KEYS = [
    "rql_outdated_notify_sig",
    "rql_version_notified_tag",
  ];

  function persistPageUpdateCache(local, remoteRaw, remoteStripped, outdated) {
    try {
      chrome.storage.local.set(
        {
          [PAGE_CACHE_KEY]: {
            ts: Date.now(),
            local: local,
            remote: remoteStripped,
            remoteRaw: remoteRaw,
            outdated: !!outdated,
          },
        },
        function () {}
      );
    } catch (_e) {}
  }

  function stripV(s) {
    s = String(s || "").trim();
    if (s.charAt(0) === "v" || s.charAt(0) === "V") {
      return s.slice(1);
    }
    return s;
  }

  function versionParts(s) {
    var core = stripV(s).split("-")[0];
    return core.split(".").map(function (p) {
      var n = parseInt(p, 10);
      return isNaN(n) ? 0 : n;
    });
  }

  /** @returns {-1|0|1} */
  function compareVersion(a, b) {
    var pa = versionParts(a);
    var pb = versionParts(b);
    var len = Math.max(pa.length, pb.length);
    for (var i = 0; i < len; i++) {
      var da = pa[i] || 0;
      var db = pb[i] || 0;
      if (da < db) {
        return -1;
      }
      if (da > db) {
        return 1;
      }
    }
    return 0;
  }

  function ensureDailyAlarm() {
    try {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MIN });
    } catch (_e) {}
  }

  function fetchLatestTag() {
    return fetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "RussianQuestLog-extension",
      },
    }).then(function (r) {
      if (!r.ok) {
        throw new Error("github " + r.status);
      }
      return r.json();
    }).then(function (data) {
      var tag = data.tag_name || data.name || "";
      return String(tag).trim();
    });
  }

  /**
   * Периодически обновляет кэш версии для баннера на questlog (без уведомлений).
   * @param {{ immediate?: boolean }} opts
   */
  function maybeRefreshVersionCache(opts) {
    opts = opts || {};
    var immediate = !!opts.immediate;
    chrome.storage.local.get(["rql_last_version_check"], function (got) {
      var now = Date.now();
      if (
        !immediate &&
        got.rql_last_version_check &&
        now - got.rql_last_version_check < CHECK_INTERVAL_MS
      ) {
        return;
      }
      fetchLatestTag()
        .then(function (remoteTagRaw) {
          chrome.storage.local.set({ rql_last_version_check: now });
          var remoteTag = stripV(remoteTagRaw);
          if (!remoteTag) {
            return;
          }
          var local = String(
            chrome.runtime.getManifest().version || "0"
          ).trim();
          var outdated = compareVersion(local, remoteTag) < 0;
          persistPageUpdateCache(local, remoteTagRaw, remoteTag, outdated);
          if (!outdated) {
            chrome.storage.local.remove(LEGACY_NOTIFY_KEYS, function () {});
          }
        })
        .catch(function () {});
    });
  }

  chrome.runtime.onInstalled.addListener(function () {
    ensureDailyAlarm();
    maybeRefreshVersionCache({ immediate: true });
  });

  chrome.runtime.onStartup.addListener(function () {
    ensureDailyAlarm();
    maybeRefreshVersionCache({ immediate: false });
  });

  chrome.alarms.onAlarm.addListener(function (a) {
    if (a && a.name === ALARM_NAME) {
      maybeRefreshVersionCache({ immediate: false });
    }
  });

  function answerOutdatedQuery(sendResponse) {
    var local = String(chrome.runtime.getManifest().version || "0").trim();
    chrome.storage.local.get(PAGE_CACHE_KEY, function (got) {
      var c = got[PAGE_CACHE_KEY];
      var now = Date.now();
      if (
        c &&
        typeof c === "object" &&
        c.ts &&
        now - c.ts < PAGE_CACHE_TTL_MS &&
        c.local === local &&
        typeof c.outdated === "boolean"
      ) {
        sendResponse({
          ok: true,
          outdated: c.outdated,
          local: local,
          remote: String(c.remote || ""),
          releasesUrl: RELEASES_PAGE,
        });
        return;
      }
      fetchLatestTag()
        .then(function (remoteTagRaw) {
          var remoteTag = stripV(remoteTagRaw);
          if (!remoteTag) {
            sendResponse({ ok: false, outdated: false });
            return;
          }
          var outdated = compareVersion(local, remoteTag) < 0;
          persistPageUpdateCache(local, remoteTagRaw, remoteTag, outdated);
          sendResponse({
            ok: true,
            outdated: outdated,
            local: local,
            remote: remoteTag,
            releasesUrl: RELEASES_PAGE,
          });
        })
        .catch(function () {
          sendResponse({ ok: false, outdated: false });
        });
    });
  }

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg || msg.type !== "rql_query_outdated") {
      return;
    }
    answerOutdatedQuery(sendResponse);
    return true;
  });
})();
