/* Eden of Kora: accessible lightbox for grouped media.
   Contract: any element with data-lightbox="<group>" and an href to the
   full asset. data-type="image"|"video", data-poster for video, caption
   from data-caption or the element's img alt. Self-contained, no
   dependencies, used on Home and Gallery. */
(function () {
  "use strict";

  var GROUPS = {};
  var dialog, panel, stage, captionEl, requestEl, prevBtn, nextBtn, liveRegion;
  var currentGroup = null;
  var currentIndex = 0;
  var lastFocused = null;
  var touchStartX = null;

  function injectStyles() {
    if (document.getElementById("lightbox-styles")) return;
    var style = document.createElement("style");
    style.id = "lightbox-styles";
    style.textContent =
      "html.lightbox-open{overflow:hidden;}" +
      ".lightbox{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;padding:var(--space-5,24px);}" +
      ".lightbox.is-open{display:flex;}" +
      ".lightbox__scrim{position:absolute;inset:0;background:rgba(22,22,22,.86);border:0;padding:0;cursor:pointer;}" +
      ".lightbox__panel{position:relative;z-index:1;width:100%;max-width:960px;max-height:90vh;display:flex;flex-direction:column;background:var(--bg-panel,#FCFAF5);border-radius:var(--radius-card,20px);box-shadow:var(--shadow-pop,0 18px 45px rgba(43,43,43,.16));overflow:hidden;}" +
      ".lightbox__panel:focus{outline:none;}" +
      ".lightbox__stage{position:relative;flex:1;display:flex;align-items:center;justify-content:center;background:var(--berry-dark,#161616);min-height:240px;}" +
      ".lightbox__stage img,.lightbox__stage video{display:block;width:100%;height:100%;max-height:78vh;object-fit:contain;}" +
      ".lightbox__caption{padding:14px 60px;font-family:var(--font-body,sans-serif);font-size:var(--text-caption,.875rem);color:var(--berry,#2B2B2B);background:var(--bg-panel,#FCFAF5);text-align:left;}" +
      ".lightbox__caption:empty{display:none;}" +
      ".lightbox__request{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);min-height:44px;margin:0 60px var(--space-4);padding:0 var(--space-4);border-radius:var(--radius-pill);background:var(--blush);color:var(--ink);border:1.5px solid color-mix(in srgb,var(--ink) 20%,var(--white));font-family:var(--font-body);font-size:.875rem;font-weight:600;line-height:1;text-decoration:none;transition:background var(--dur-standard) var(--ease-snap),border-color var(--dur-standard) var(--ease-snap),transform var(--dur-micro) var(--ease-snap);}" +
      ".lightbox__request[hidden]{display:none;}" +
      ".lightbox__request svg{width:16px;height:16px;flex-shrink:0;}" +
      ".lightbox__request:hover{background:color-mix(in srgb,var(--pink) 40%,var(--white));border-color:var(--ink);}" +
      ".lightbox__request:active{transform:scale(.97);}" +
      ".lightbox__request:focus-visible{outline:2px solid var(--ink);outline-offset:3px;}" +
      ".lightbox__close,.lightbox__nav{position:absolute;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:var(--radius-pill,999px);background:var(--bg-panel,#FCFAF5);color:var(--berry,#2B2B2B);border:none;cursor:pointer;transition:transform var(--dur-standard,.2s) var(--ease-snap,ease),background var(--dur-standard,.2s) var(--ease-snap,ease);}" +
      ".lightbox__close{top:16px;right:16px;z-index:2;}" +
      ".lightbox__nav{top:50%;margin-top:-22px;z-index:2;}" +
      ".lightbox__nav--prev{left:16px;}" +
      ".lightbox__nav--next{right:16px;}" +
      ".lightbox__close:hover,.lightbox__nav:hover{background:var(--pink-pale,#FDDBE8);transform:translateY(-1px);}" +
      ".lightbox__close:focus-visible,.lightbox__nav:focus-visible,.lightbox__panel:focus-visible{outline:2px solid var(--pink-strong,#EE5C97);outline-offset:2px;}" +
      ".lightbox__close svg,.lightbox__nav svg{width:20px;height:20px;}" +
      ".lightbox__nav[hidden]{display:none;}" +
      "@media (max-width:600px){.lightbox{padding:var(--space-3,12px);}.lightbox__caption{padding:12px 20px;}.lightbox__request{margin-inline:20px;}}";
    document.head.appendChild(style);
  }

  function buildDialog() {
    if (dialog) return;
    dialog = document.createElement("div");
    dialog.className = "lightbox";
    dialog.innerHTML =
      '<button type="button" class="lightbox__scrim" data-lightbox-close aria-label="Close"></button>' +
      '<div class="lightbox__panel" role="dialog" aria-modal="true" aria-label="Media viewer" tabindex="-1">' +
        '<button type="button" class="lightbox__close" data-lightbox-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        "</button>" +
        '<button type="button" class="lightbox__nav lightbox__nav--prev" data-lightbox-prev aria-label="Previous">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>' +
        "</button>" +
        '<div class="lightbox__stage"></div>' +
        '<button type="button" class="lightbox__nav lightbox__nav--next" data-lightbox-next aria-label="Next">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' +
        "</button>" +
        '<p class="lightbox__caption"></p>' +
        '<a class="lightbox__request" data-lightbox-request target="_blank" rel="noopener" hidden>' +
          '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.560 6.560 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.560 6.560 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>' +
          "<span>Request similar on WhatsApp</span>" +
        "</a>" +
      "</div>" +
      '<div class="sr-only" aria-live="polite" data-lightbox-live></div>';
    document.body.appendChild(dialog);

    panel = dialog.querySelector(".lightbox__panel");
    stage = dialog.querySelector(".lightbox__stage");
    captionEl = dialog.querySelector(".lightbox__caption");
    requestEl = dialog.querySelector("[data-lightbox-request]");
    prevBtn = dialog.querySelector("[data-lightbox-prev]");
    nextBtn = dialog.querySelector("[data-lightbox-next]");
    liveRegion = dialog.querySelector("[data-lightbox-live]");

    dialog.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    prevBtn.addEventListener("click", function () { step(-1); });
    nextBtn.addEventListener("click", function () { step(1); });
    dialog.addEventListener("keydown", onKeydown);
    dialog.addEventListener("touchstart", onTouchStart, { passive: true });
    dialog.addEventListener("touchend", onTouchEnd, { passive: true });
  }

  function collectGroups() {
    GROUPS = {};
    document.querySelectorAll("[data-lightbox]").forEach(function (el) {
      var group = el.getAttribute("data-lightbox");
      if (!GROUPS[group]) GROUPS[group] = [];
      GROUPS[group].push(el);
      if (!el.dataset.lightboxBound) {
        el.dataset.lightboxBound = "1";
        el.addEventListener("click", function (e) {
          e.preventDefault();
          var items = GROUPS[group];
          open(group, items.indexOf(el));
        });
      }
    });
  }

  function render() {
    var el = GROUPS[currentGroup][currentIndex];
    var type = el.getAttribute("data-type") || "image";
    var href = el.getAttribute("href");
    var innerImg = el.querySelector("img");
    var caption = el.getAttribute("data-caption") || (innerImg ? innerImg.alt : "") || "";

    stage.innerHTML = "";
    if (type === "video") {
      var video = document.createElement("video");
      video.src = href;
      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      var poster = el.getAttribute("data-poster");
      if (poster) video.poster = poster;
      stage.appendChild(video);
    } else {
      var img = document.createElement("img");
      img.src = href;
      img.alt = caption;
      stage.appendChild(img);
    }
    captionEl.textContent = caption;
    var waUrl = caption && typeof window.requestSimilarUrl === "function" ? window.requestSimilarUrl(caption.replace(/[.\s]+$/, "")) : "";
    if (waUrl) {
      requestEl.href = waUrl;
      requestEl.hidden = false;
    } else {
      requestEl.removeAttribute("href");
      requestEl.hidden = true;
    }

    var items = GROUPS[currentGroup];
    var multi = items.length > 1;
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
    if (liveRegion) {
      liveRegion.textContent = (caption ? caption + ", " : "") + (currentIndex + 1) + " of " + items.length;
    }
  }

  function open(group, index) {
    buildDialog();
    currentGroup = group;
    currentIndex = index;
    lastFocused = document.activeElement;
    render();
    dialog.classList.add("is-open");
    document.documentElement.classList.add("lightbox-open");
    panel.focus();
    document.addEventListener("keydown", trapTab, true);
  }

  function close() {
    if (!dialog || !dialog.classList.contains("is-open")) return;
    var video = stage.querySelector("video");
    if (video) video.pause();
    dialog.classList.remove("is-open");
    document.documentElement.classList.remove("lightbox-open");
    document.removeEventListener("keydown", trapTab, true);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function step(dir) {
    var items = GROUPS[currentGroup];
    currentIndex = (currentIndex + dir + items.length) % items.length;
    render();
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  }

  function trapTab(e) {
    if (e.key !== "Tab" || !dialog.classList.contains("is-open")) return;
    var focusable = dialog.querySelectorAll('button:not([hidden]), [href], [tabindex]:not([tabindex="-1"])');
    var list = Array.prototype.filter.call(focusable, function (el) { return el.offsetParent !== null; });
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onTouchStart(e) {
    touchStartX = e.changedTouches[0].clientX;
  }

  function onTouchEnd(e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 40) return;
    step(dx > 0 ? -1 : 1);
  }

  function init() {
    injectStyles();
    collectGroups();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.EdenLightbox = { refresh: collectGroups };
})();
