(function () {
  "use strict";

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

  function runRemovals() {
    removeSlotBlocks();
    removeOrbWeaponButtons();
    removeArtifactsTabButton();
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

  var obs = new MutationObserver(scheduleRemove);
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
