/* ddplot site enhancements: gallery filter, reference pills, copy button,
   reveal-on-scroll and back-to-top. Plain JS, no dependencies. */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // Path to the site root from the current page, e.g. "../" from articles/.
  function siteRoot() {
    var brand = document.querySelector(".navbar-brand");
    if (!brand) return "";
    return brand.getAttribute("href").replace(/index\.html$/, "");
  }

  // Gallery: chips + search, synced with the URL hash (#family=time-series).
  function initGallery() {
    var gallery = document.querySelector(".dd-gallery:not(.dd-gallery-featured)");
    var tools = document.querySelector(".dd-gallery-tools");
    if (!gallery || !tools) return;
    var cards = Array.prototype.slice.call(gallery.querySelectorAll(".dd-card"));
    var chips = Array.prototype.slice.call(tools.querySelectorAll(".dd-chip"));
    var search = tools.querySelector(".dd-search");
    var empty = document.querySelector(".dd-empty");
    var current = "all";

    function apply() {
      var q = (search.value || "").trim().toLowerCase();
      var terms = q ? q.split(/\s+/) : [];
      var shown = 0;
      cards.forEach(function (card) {
        var okCat = current === "all" || card.getAttribute("data-category") === current;
        var hay = card.getAttribute("data-search") || "";
        var okText = terms.every(function (t) { return hay.indexOf(t) !== -1; });
        card.hidden = !(okCat && okText);
        if (!card.hidden) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    }

    function select(filter, push) {
      current = chips.some(function (c) { return c.getAttribute("data-filter") === filter; }) ? filter : "all";
      chips.forEach(function (c) {
        var on = c.getAttribute("data-filter") === current;
        c.classList.toggle("active", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (push && history.replaceState) {
        history.replaceState(null, "", current === "all" ? location.pathname : "#family=" + current);
      }
      apply();
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () { select(c.getAttribute("data-filter"), true); });
    });
    search.addEventListener("input", apply);
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement === document.body) {
        e.preventDefault();
        search.focus();
      }
    });

    var m = location.hash.match(/family=([\w-]+)/);
    select(m ? m[1] : "all", false);
  }

  // Chart guides: add a "Reference" pill next to every `fn()` heading.
  function initReferencePills() {
    if (!document.querySelector(".template-article")) return;
    var root = siteRoot();
    document.querySelectorAll("main h2").forEach(function (h) {
      var code = h.querySelector(":scope > code");
      if (!code) return;
      var m = code.textContent.match(/^([a-z_]+)\(\)$/);
      if (!m) return;
      h.setAttribute("data-toc-text", m[1] + "()");
      var a = document.createElement("a");
      a.className = "dd-ref-pill";
      a.href = root + "reference/" + m[1] + ".html";
      a.textContent = "Reference";
      a.title = "Arguments of " + m[1] + "()";
      var anchor = h.querySelector("a.anchor");
      h.insertBefore(a, anchor || null);
    });
  }

  // Copy buttons with a data-copy attribute (the install command on the home page).
  function initCopy() {
    document.querySelectorAll(".dd-copy[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy");
        var done = function () {
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = "Copy"; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        }
      });
    });
  }

  // Fade cards and family tiles in as they scroll into view.
  function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var items = document.querySelectorAll(".dd-card, .dd-family, .dd-feature");
    if (!items.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("dd-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el, i) {
      el.classList.add("dd-reveal");
      el.style.transitionDelay = (i % 6) * 40 + "ms";
      io.observe(el);
    });
  }

  // Back-to-top button on long pages.
  function initTop() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dd-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = "&uarr;";
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.body.appendChild(btn);
    var onScroll = function () { btn.classList.toggle("dd-show", window.scrollY > 900); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  ready(function () {
    initGallery();
    initReferencePills();
    initCopy();
    initReveal();
    initTop();
  });
})();
