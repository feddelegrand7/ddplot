// playkit.js -- shared helpers for the playful charts (heart_fill(),
// glass_fill(), plant_growth(), flame(), flower()).
//
// Prepended after ddplotreset.js by play_script() (R/playful_utils.R), so
// everything here lives in the same r2d3 function scope as the chart script
// (svg, width, height, options, r2d3, d3, ddplotTrack, ...). Works with D3 v5
// and v6.

const pkIsV6 = typeof d3.pointer === "function";
const pkEvOf = a => pkIsV6 ? a : d3.event;
const pkPtr = (a, node) => pkIsV6 ? d3.pointer(a, node) : d3.mouse(node);
const pkUid = p => (p || "pk") + Math.random().toString(36).slice(2, 9);
const pkNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
// users who asked their system for less motion get calm (but still working) charts
const pkCalm = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function pkNum(v, def) {
  return (v === null || v === undefined || v === "NA" || v === "" || !isFinite(+v)) ? def : +v;
}
// a size given as a number or as a CSS string ("16px")
function pkPx(v, def) {
  if (v === null || v === undefined) return def;
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : def;
}
function pkArr(v) { return (v === null || v === undefined) ? [] : [].concat(v); }
function pkMix(a, b, k) { return d3.interpolateRgb(a, b)(k); }
function pkClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---- text measurement -------------------------------------------------------------
function pkMeasure(svgSel, font) {
  const m = svgSel.append("text").attr("x", -9999).attr("y", -9999).style("font-family", font)
    .attr("aria-hidden", "true");
  return function (str, size, weight) {
    m.style("font-size", size + "px").style("font-weight", weight || 400).text(str);
    const w = m.node().getComputedTextLength();
    m.text("");
    return w > 0 ? w : String(str).length * size * 0.6;
  };
}

// ---- Shiny ------------------------------------------------------------------------
function pkHostId(svgSel) {
  let el = svgSel.node();
  while (el) {
    if (el.classList && el.classList.contains("html-widget")) return el.id || null;
    el = el.parentNode || el.host || null;
  }
  return null;
}
function pkShiny(svgSel) {
  const id = pkHostId(svgSel);
  return function (suffix, value) {
    if (id && window.Shiny && typeof window.Shiny.setInputValue === "function") {
      window.Shiny.setInputValue(id + "_" + suffix, value, { priority: "event" });
    }
  };
}

// ---- state kept across Shiny re-renders -------------------------------------------
function pkState(key) {
  const all = r2d3.ddplotPlay || (r2d3.ddplotPlay = {});
  return all[key] || (all[key] = {});
}

// ---- animation loop -------------------------------------------------------------------
// pkLoop(svg, frame): calls frame(nowMs) on every animation frame, but only while
// the chart is on screen (pages with many widgets stay light). onVisible(cb) runs
// cb once, the first time the chart is seen.
function pkLoop(svgSel, frame) {
  let timer = null, visible = false, seen = false, obs = null;
  const firsts = [];
  function run() {
    if (timer) return;
    timer = d3.timer(() => frame(pkNow()));
  }
  function halt() { if (timer) { timer.stop(); timer = null; } }
  function becomeVisible() {
    visible = true;
    if (!seen) { seen = true; firsts.splice(0).forEach(cb => cb()); }
    run();
  }
  ddplotTrack({ stop() { halt(); if (obs) obs.disconnect(); } });
  if (typeof IntersectionObserver === "function") {
    obs = new IntersectionObserver(entries => {
      const e = entries[entries.length - 1];
      if (e.isIntersecting) becomeVisible();
      else { visible = false; halt(); }
    }, { threshold: [0, 0.25] });
    obs.observe(svgSel.node());
  } else {
    ddplotTrack(d3.timeout(becomeVisible, 50));
  }
  frame(pkNow());
  return {
    onVisible(cb) { if (seen) cb(); else firsts.push(cb); },
    visible: () => visible,
    draw: () => frame(pkNow())
  };
}

// A number that eases from its current value to a new one.
function pkTween(v0) {
  let from = v0, to = v0, t0 = 0, dur = 0, ease = d3.easeCubicOut;
  const api = {
    get(now) {
      if (!dur) return to;
      const k = Math.min(1, (now - t0) / dur);
      if (k >= 1) { dur = 0; return to; }
      return from + (to - from) * ease(k);
    },
    set(v, ms, easeFn) {
      const now = pkNow();
      from = api.get(now); to = v; t0 = now; dur = ms || 0; ease = easeFn || d3.easeCubicOut;
      if (!dur) from = v;
    },
    target: () => to,
    moving: () => dur > 0
  };
  return api;
}

// ---- tooltip --------------------------------------------------------------------------
// pkTip(svg, {font, color, bgcol, W, H, measure}).show(head, rows, x, y)
//   rows: [{name, value, color}]
function pkTip(svgSel, cfg) {
  const uid = pkUid("pktip");
  svgSel.append("defs").append("filter").attr("id", uid).attr("x", "-20%").attr("y", "-20%")
    .attr("width", "140%").attr("height", "140%")
    .append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3)
    .attr("flood-color", "#000").attr("flood-opacity", 0.14);
  const g = svgSel.append("g").attr("class", "pk-tip").style("pointer-events", "none").style("display", "none");
  const rect = g.append("rect").attr("rx", 6).attr("fill", cfg.bgcol).attr("stroke", cfg.color)
    .attr("stroke-opacity", 0.12).attr("filter", `url(#${uid})`);
  const body = g.append("g").style("font-family", cfg.font);
  function show(head, rows, x, y, headColor) {
    body.selectAll("*").remove();
    const pad = 10, fs = 11.5, lh = 18;
    const hx = headColor ? pad + 15 : pad;
    if (headColor) body.append("rect").attr("x", pad).attr("y", pad).attr("width", 9).attr("height", 9)
      .attr("rx", 2).attr("fill", headColor);
    body.append("text").attr("x", hx).attr("y", pad + 9).style("font-size", fs + "px")
      .style("font-weight", 700).style("fill", cfg.color).text(head);
    let w = hx + cfg.measure(head, fs, 700) + pad;
    let maxN = 0, maxV = 0;
    (rows || []).forEach(r => {
      maxN = Math.max(maxN, cfg.measure(r.name, fs));
      maxV = Math.max(maxV, r.value ? cfg.measure(r.value, fs, 700) : 0);
    });
    const colV = pad + maxN + 16 + maxV;
    (rows || []).forEach((r, k) => {
      const ry = pad + 9 + (k + 1) * lh + 2;
      body.append("text").attr("x", pad).attr("y", ry).style("font-size", fs + "px")
        .style("fill", cfg.color).style("fill-opacity", 0.75).text(r.name);
      if (r.value) body.append("text").attr("x", colV).attr("y", ry).attr("text-anchor", "end")
        .style("font-size", fs + "px").style("font-weight", 700).style("fill", r.color || cfg.color).text(r.value);
    });
    if (rows && rows.length) w = Math.max(w, colV + pad);
    const h = pad * 2 + 11 + (rows ? rows.length : 0) * lh + 2;
    rect.attr("width", w).attr("height", h);
    move(x, y);
    g.raise();
  }
  function move(x, y) {
    const tw = +rect.attr("width"), th = +rect.attr("height");
    let tx = x + 14;
    if (tx + tw > cfg.W - 4) tx = x - 14 - tw;
    tx = Math.max(4, tx);
    const ty = pkClamp(y - th - 10, 4, Math.max(4, cfg.H - th - 4));
    g.attr("transform", `translate(${tx},${ty})`).style("display", null);
  }
  return { show, move, hide() { g.style("display", "none"); } };
}

// ---- level charts (heart, glass, plant): label, caption, drag to set ---------------------
// The percentage, formatted.
function pkPct(v) { return Math.round(v * 100) + "%"; }

// Drag (and arrow keys) to set a level from 0 to 1.
//   pkLevelInput(svg, area, {yToLevel, onLevel, send})
//   area: the selection that receives the drag (in svg root coordinates)
function pkLevelInput(svgSel, area, cfg) {
  let last = null;
  function setFrom(y) {
    const v = Math.round(pkClamp(cfg.yToLevel(y), 0, 1) * 100) / 100;
    if (v !== last) { last = v; cfg.onLevel(v, true); }
  }
  area.style("cursor", "ns-resize").call(d3.drag()
    .on("start", function (a) { const p = pkPtr(a, svgSel.node()); last = null; setFrom(p[1]); })
    .on("drag", function (a) { const p = pkPtr(a, svgSel.node()); setFrom(p[1]); })
    .on("end", function () { if (last !== null) cfg.send("value", last); }));
  svgSel.attr("tabindex", 0).style("outline", "none").on("keydown", function (a) {
    const ev = pkEvOf(a);
    const step = ev.shiftKey ? 0.1 : 0.01;
    let d = 0;
    if (ev.key === "ArrowUp" || ev.key === "ArrowRight") d = step;
    else if (ev.key === "ArrowDown" || ev.key === "ArrowLeft") d = -step;
    else return;
    ev.preventDefault();
    const v = Math.round(pkClamp(cfg.current() + d, 0, 1) * 100) / 100;
    cfg.onLevel(v, false);
    cfg.send("value", v);
  });
}
