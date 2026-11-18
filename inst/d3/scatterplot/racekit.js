// racekit.js -- shared toolkit for the race charts (bar_chart_race(),
// line_race(), bubble_race(), radial_bar_race(), treemap_race(), donut_race()).
//
// Prepended after ddplotreset.js by ddplot_script(c("racekit.js", "<chart>.js")),
// so everything here lives in the same r2d3 function scope as the chart
// script (svg, width, height, options, r2d3, d3, ddplotTrack, ...).
//
// The player drives a continuous time t in [0, nFrames - 1]: t = 2.5 is half
// way between the third and the fourth period. Charts read their values at t
// with ddRaceAt() / ddRacePresence() and redraw everything in onRender(t), so
// playing, scrubbing and stepping are all smooth. Works with D3 v5 and v6.

const DD_PALETTE = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
  "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0"];
const DD_ACCENT = "#4269d0";
const ddIsV6 = typeof d3.pointer === "function";
const ddEvOf = a => ddIsV6 ? a : d3.event;
const ddPtr = (a, node) => ddIsV6 ? d3.pointer(a, node) : d3.mouse(node);

function ddArr(v) { return (v === null || v === undefined) ? [] : [].concat(v); }
function ddNum(v) {
  return (v === null || v === undefined || v === "NA" || v === "" || !isFinite(+v)) ? null : +v;
}

// ---- formats ------------------------------------------------------------------------
// ddFormatter(o): value formats from o.valueFormat / o.valuePrefix / o.valueSuffix.
//   f.value(v)  full value ("1,234,567", "$12.5"),
//   f.short(v)  compact value for labels and axes ("1.23M", "12.5k").
function ddFormatter(o) {
  const core = o.valueFormat ? d3.format(o.valueFormat) : null;
  const pre = o.valuePrefix || "", suf = o.valueSuffix || "";
  function auto(a) {
    if (a >= 1e6) return d3.format(".3~s")(a).replace("G", "B");
    if (Number.isInteger(a)) return d3.format(",")(a);
    if (a >= 1000) return d3.format(",.0f")(a);
    return d3.format(a >= 100 ? ",.1~f" : ",.2~f")(a);
  }
  function short(a) {
    if (a >= 1e4) return d3.format(".3~s")(a).replace("G", "B");
    return auto(a);
  }
  const wrap = (v, f) => (v === null || v === undefined || !isFinite(v)) ? "–"
    : (v < 0 ? "−" : "") + pre + f(Math.abs(v)) + suf;
  return {
    value: v => wrap(v, core || auto),
    short: v => wrap(v, core || short),
    raw: core
  };
}

// ---- text measurement -----------------------------------------------------------------
function ddMeasure(svg, font) {
  const m = svg.append("text").attr("x", -9999).attr("y", -9999).style("font-family", font)
    .attr("aria-hidden", "true");
  function tw(str, size, weight) {
    m.style("font-size", size + "px").style("font-weight", weight || 400).text(str);
    const w = m.node().getComputedTextLength();
    m.text("");
    return w > 0 ? w : String(str).length * size * 0.6;
  }
  function truncate(str, maxW, size, weight) {
    str = String(str);
    if (tw(str, size, weight) <= maxW) return str;
    let s = str;
    while (s.length > 1 && tw(s + "…", size, weight) > maxW) s = s.slice(0, -1);
    return s + "…";
  }
  return { tw, truncate };
}

// black or white text, whichever reads best on `color`
function ddTextOn(color) {
  const c = d3.rgb(color);
  const lin = u => { u /= 255; return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  return L > 0.36 ? "#222222" : "#ffffff";
}

// colours for n items: given colours, a D3 scheme name, or the palette
function ddColors(n, given, schemeName) {
  const g = ddArr(given).filter(c => c !== null && c !== "NA");
  if (g.length) return d3.range(n).map(k => g[k % g.length]);
  let sc = schemeName ? d3["scheme" + schemeName] : null;
  if (sc && sc.length && typeof sc[0] !== "string") sc = sc[sc.length - 1];
  const pal = (sc && sc.length) ? sc : DD_PALETTE;
  return d3.range(n).map(k => pal[k % pal.length]);
}

// ---- Shiny ----------------------------------------------------------------------------------
function ddHostId(svgSel) {
  let el = svgSel.node();
  while (el) {
    if (el.classList && el.classList.contains("html-widget")) return el.id || null;
    el = el.parentNode || el.host || null;
  }
  return null;
}
function ddShiny(svgSel) {
  const id = ddHostId(svgSel);
  return function (suffix, value) {
    if (id && window.Shiny && typeof window.Shiny.setInputValue === "function") {
      window.Shiny.setInputValue(id + "_" + suffix, value, { priority: "event" });
    }
  };
}

// ---- series at a continuous time ------------------------------------------------------------
function ddEase(name, fallback) {
  const f = name ? d3["ease" + name] : null;
  return typeof f === "function" ? f : (fallback || d3.easeLinear);
}
// The value of a series (one value per frame, null when missing) at time t.
// When one side is missing, the known side is returned (use ddRacePresence()
// to fade items in and out).
function ddRaceAt(series, t, ease) {
  const n = series.length;
  if (!n) return null;
  if (t <= 0) return ddNum(series[0]);
  if (t >= n - 1) return ddNum(series[n - 1]);
  const i0 = Math.floor(t), f = (ease || d3.easeLinear)(t - i0);
  const a = ddNum(series[i0]), b = ddNum(series[i0 + 1]);
  if (a === null) return b;
  if (b === null) return a;
  return a + (b - a) * f;
}
// How present an item is at time t, from 0 (missing) to 1.
function ddRacePresence(series, t, ease) {
  const n = series.length;
  if (!n) return 0;
  const tc = Math.max(0, Math.min(n - 1, t));
  const i0 = Math.min(n - 1, Math.floor(tc)), f = (ease || d3.easeLinear)(tc - i0);
  const a = ddNum(series[i0]) !== null ? 1 : 0;
  const b = i0 + 1 < n ? (ddNum(series[i0 + 1]) !== null ? 1 : 0) : a;
  return a + (b - a) * f;
}
// Interpolate any per-frame numbers (e.g. precomputed ranks) at time t.
function ddLerpFrames(arr, t, ease) {
  const n = arr.length;
  if (!n) return 0;
  if (t <= 0) return arr[0];
  if (t >= n - 1) return arr[n - 1];
  const i0 = Math.floor(t), f = (ease || d3.easeLinear)(t - i0);
  return arr[i0] + (arr[i0 + 1] - arr[i0]) * f;
}

// ---- tooltip --------------------------------------------------------------------------------
// ddTooltip(svg, {font, axisCol, bgcol, W, H, measure})
//   .show(head, rows, mx, my, headColor)   rows: {name, value, color, bold, extra, sep, dim}
//   .move(mx, my), .hide(), .raise(), .visible()
function ddTooltip(svgSel, cfg) {
  const uid = "ddtip" + Math.random().toString(36).slice(2, 8);
  const defs = svgSel.append("defs");
  defs.append("filter").attr("id", uid).attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%")
    .append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3)
    .attr("flood-color", "#000").attr("flood-opacity", 0.14);
  const g = svgSel.append("g").attr("class", "dd-tip").style("pointer-events", "none").style("display", "none");
  const rect = g.append("rect").attr("rx", 6).attr("fill", cfg.bgcol).attr("stroke", cfg.axisCol)
    .attr("stroke-opacity", 0.12).attr("filter", `url(#${uid})`);
  const body = g.append("g");
  const ms = cfg.measure;
  let lastMx = 0, lastMy = 0;
  function build(head, rows, headColor) {
    body.selectAll("*").remove();
    const pad = 10, lh = 18, fs = 11.5, ax = cfg.axisCol;
    let y = pad + 9;
    const h0 = ms.truncate(head, 260, fs, 700);
    if (headColor) body.append("rect").attr("x", pad).attr("y", y - 9).attr("width", 9).attr("height", 9)
      .attr("rx", 2).attr("fill", headColor);
    const hx = headColor ? pad + 15 : pad;
    body.append("text").attr("x", hx).attr("y", y).style("font-size", fs + "px").style("font-weight", 700)
      .style("fill", ax).text(h0);
    let w = hx + ms.tw(h0, fs, 700) + pad;
    y += lh + 2;
    let maxName = 0, maxVal = 0, maxExtra = 0;
    rows.forEach(r => {
      r._n = ms.truncate(r.name, 180, fs, r.bold ? 700 : 400);
      maxName = Math.max(maxName, ms.tw(r._n, fs, r.bold ? 700 : 400));
      maxVal = Math.max(maxVal, r.value ? ms.tw(r.value, fs, 700) : 0);
      maxExtra = Math.max(maxExtra, r.extra ? ms.tw(r.extra, 10.5) + 8 : 0);
    });
    const hasSw = rows.some(r => r.color);
    const nameX = pad + (hasSw ? 14 : 0);
    const colVal = nameX + maxName + 18 + maxVal;
    let off = 0;
    rows.forEach((r, k) => {
      if (r.sep) off += 4;
      const ry = y + k * lh + off;
      if (r.sep) body.append("line").attr("x1", pad).attr("x2", colVal + maxExtra)
        .attr("y1", ry - 13).attr("y2", ry - 13).attr("stroke", ax).attr("stroke-opacity", 0.15);
      if (r.color) body.append("circle").attr("cx", pad + 4).attr("cy", ry - 4).attr("r", 4).attr("fill", r.color);
      body.append("text").attr("x", r.color ? nameX : pad).attr("y", ry).style("font-size", (r.dim ? 10.5 : fs) + "px")
        .style("font-weight", r.bold ? 700 : 400).style("fill", ax)
        .style("fill-opacity", r.bold ? 1 : (r.dim ? 0.55 : 0.75)).text(r._n);
      if (r.value) body.append("text").attr("x", colVal).attr("y", ry).attr("text-anchor", "end")
        .style("font-size", fs + "px").style("font-weight", 700).style("fill", r.valueColor || ax).text(r.value);
      if (r.extra) body.append("text").attr("x", colVal + 8).attr("y", ry)
        .style("font-size", "10.5px").style("fill", r.extraColor || ax).style("fill-opacity", r.extraColor ? 1 : 0.55).text(r.extra);
    });
    w = Math.max(w, colVal + maxExtra + pad);
    const h = y + (rows.length ? (rows.length - 1) * lh : -lh) + off + pad + 2;
    rect.attr("width", w).attr("height", h);
  }
  function move(mx, my) {
    lastMx = mx; lastMy = my;
    const tipW = +rect.attr("width"), tipH = +rect.attr("height");
    let tx = mx + 16;
    if (tx + tipW > cfg.W - 4) tx = mx - 16 - tipW;
    if (tx < 4) tx = 4;
    const ty = Math.max(4, Math.min(cfg.H - tipH - 4, my - tipH / 2));
    g.attr("transform", `translate(${tx},${ty})`).style("display", null);
  }
  return {
    show(head, rows, mx, my, headColor) { build(head, rows || [], headColor); move(mx === undefined ? lastMx : mx, my === undefined ? lastMy : my); g.raise(); },
    move,
    hide() { g.style("display", "none"); },
    visible() { return g.style("display") !== "none"; },
    raise() { g.raise(); }
  };
}

// ---- the player -------------------------------------------------------------------------------
// ddRacePlayer(cfg)
//   cfg.svg, cfg.W, cfg.H, cfg.font, cfg.axisCol, cfg.bgcol, cfg.measure
//   cfg.frames     frame labels (strings), cfg.frameNum (numbers or null),
//   cfg.timeType   "number" | "date" | "datetime" | "category"
//   cfg.o          options: frameDur (ms per period), ease, autoplay, loop,
//                  controls, startFrame ("first", "last" or a 1-based number),
//                  timeFormat (d3 time format for dates), stateKey
//   cfg.onRender(t)  redraws the chart at time t
//   cfg.onFrame(i)   optional, called when the nearest frame changes
// Returns { height, top, t(), seek(t, dur), play(), pause(), toggle(),
//           playing(), label(t), frameIndex(t), start(), n, ease }
// The controls (play / pause, timeline, speed, loop) are drawn at the bottom
// of the svg, in the last `height` pixels.
function ddRacePlayer(cfg) {
  const o = cfg.o || {};
  const svgSel = cfg.svg;
  const frames = ddArr(cfg.frames).map(String);
  const n = frames.length;
  const frameNum = cfg.frameNum ? ddArr(cfg.frameNum).map(Number) : null;
  const timeType = cfg.timeType || "category";
  const ms = cfg.measure;
  const axisCol = cfg.axisCol, bgcol = cfg.bgcol, font = cfg.font;
  const ease = ddEase(o.ease, d3.easeCubicInOut);
  const frameDur = Math.max(30, +o.frameDur || 800);
  const send = ddShiny(svgSel);

  // persistent state (Shiny updates / resizes)
  const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
  if (!state.race || state.race.key !== o.stateKey) state.race = { key: o.stateKey };
  const st = state.race;

  // ---- period labels ----
  const isDate = timeType === "date" || timeType === "datetime";
  const dateFmt = (function () {
    if (!isDate) return null;
    if (o.timeFormat) return (timeType === "date" ? d3.utcFormat : d3.utcFormat)(o.timeFormat);
    // pick a format from the spacing of the periods
    const step = n > 1 ? (frameNum[n - 1] - frameNum[0]) / (n - 1) : 86400000;
    const day = 86400000;
    if (timeType === "datetime" && step < day) return d3.utcFormat("%b %d, %H:%M");
    if (step >= 360 * day) return d3.utcFormat("%Y");
    if (step >= 28 * day) return d3.utcFormat("%b %Y");
    return d3.utcFormat("%b %d, %Y");
  })();
  const intYears = timeType === "number" && frameNum && frameNum.every(v => Number.isInteger(v));
  function label(t) {
    t = Math.max(0, Math.min(n - 1, t));
    const i = Math.round(t);
    if (timeType === "number" && frameNum) {
      // between two periods, show the interpolated period (1953, 1954, ...)
      const v = ddLerpFrames(frameNum, t);
      if (intYears) {
        const step = n > 1 ? Math.abs(frameNum[Math.min(n - 1, Math.floor(t) + 1)] - frameNum[Math.floor(t)]) : 1;
        return String(step > 1 ? Math.round(v) : frameNum[i]);
      }
      return frames[i];
    }
    if (isDate) {
      const v = ddLerpFrames(frameNum, t);
      // snap to the frame when the periods are coarse (months, years)
      return dateFmt(new Date(Math.abs(t - i) < 0.02 ? frameNum[i] : v));
    }
    return frames[i];
  }
  function frameLabel(i) {
    if (isDate) return dateFmt(new Date(frameNum[i]));
    return frames[i];
  }

  // ---- controls layout ----
  const showControls = o.controls !== false && n > 1;
  const height = showControls ? 46 : 0;
  const top = cfg.H - height;
  const padL = 14, padR = 16;

  let t = 0;
  if (st.t !== undefined && st.t !== null && isFinite(st.t)) t = Math.max(0, Math.min(n - 1, st.t));
  else if (o.startFrame === "last") t = n - 1;
  else if (typeof o.startFrame === "number" && isFinite(o.startFrame)) t = Math.max(0, Math.min(n - 1, o.startFrame - 1));
  let speed = st.speed || 1;
  let loop = st.loop !== undefined ? st.loop : !!o.loop;
  let playing = false, timer = null, lastEl = null, endTimer = null, seekTimer = null;
  let lastFrame = -1;
  const speeds = [0.5, 1, 2, 4];

  const g = svgSel.append("g").attr("class", "dd-player")
    .style("user-select", "none").style("-webkit-user-select", "none");
  let playBtn = null, playIcon = null, track = null, fillBar = null, handle = null, ticksG = null,
    hoverLbl = null, speedTxt = null, loopG = null, x0 = 0, x1 = 0, cy = 0;
  const tx = v => x0 + (n > 1 ? (x1 - x0) * v / (n - 1) : 0);
  const xt = px => Math.max(0, Math.min(n - 1, (px - x0) / Math.max(1, x1 - x0) * (n - 1)));

  if (showControls) {
    cy = top + height / 2 + 1;
    g.append("line").attr("x1", padL).attr("x2", cfg.W - padR).attr("y1", top + 2).attr("y2", top + 2)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.08);
    // play / pause
    const r = 15;
    playBtn = g.append("g").attr("class", "dd-play").attr("transform", `translate(${padL + r},${cy})`)
      .style("cursor", "pointer");
    playBtn.append("title").text("Play / pause (space). Step with the arrow keys.");
    playBtn.append("circle").attr("r", r).attr("fill", DD_ACCENT);
    playIcon = playBtn.append("path").attr("fill", "white");
    // speed and loop on the right
    const spW = ms.tw("0.5×", 11, 700) + 16, lpW = 28, bh = 22;
    const loopX = cfg.W - padR - lpW;
    const spX = loopX - 6 - spW;
    const sp = g.append("g").attr("class", "dd-speed").attr("transform", `translate(${spX},${cy - bh / 2})`).style("cursor", "pointer");
    sp.append("title").text("Playback speed");
    sp.append("rect").attr("width", spW).attr("height", bh).attr("rx", 5).attr("fill", bgcol)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.2);
    speedTxt = sp.append("text").attr("x", spW / 2).attr("y", bh / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
      .style("font-size", "11px").style("font-weight", 700).style("fill", axisCol).style("font-family", font);
    sp.on("click", function () {
      speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
      st.speed = speed;
      styleControls();
    });
    loopG = g.append("g").attr("class", "dd-loop").attr("transform", `translate(${loopX},${cy - bh / 2})`).style("cursor", "pointer");
    loopG.append("title").text("Loop");
    loopG.append("rect").attr("class", "bg").attr("width", lpW).attr("height", bh).attr("rx", 5).attr("fill", bgcol)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.2);
    // a loop arrow
    loopG.append("path").attr("class", "ic").attr("fill", "none").attr("stroke-width", 1.6).attr("stroke-linecap", "round")
      .attr("d", `M${lpW / 2 + 5},${bh / 2 - 2}A5.5 5.5 0 1 0 ${lpW / 2 + 5.3},${bh / 2 + 2.5}`);
    loopG.append("path").attr("class", "ar")
      .attr("d", `M${lpW / 2 + 2.2},${bh / 2 - 3.6}L${lpW / 2 + 6.4},${bh / 2 - 1.2}L${lpW / 2 + 6.6},${bh / 2 - 6}Z`);
    loopG.on("click", function () { loop = !loop; st.loop = loop; styleControls(); });

    // timeline
    x0 = padL + 2 * r + 18;
    x1 = spX - 18;
    track = g.append("g").attr("class", "dd-track");
    track.append("line").attr("x1", x0).attr("x2", x1).attr("y1", cy).attr("y2", cy)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.15).attr("stroke-width", 4).attr("stroke-linecap", "round");
    fillBar = track.append("line").attr("x1", x0).attr("y1", cy).attr("y2", cy)
      .attr("stroke", DD_ACCENT).attr("stroke-width", 4).attr("stroke-linecap", "round");
    ticksG = track.append("g");
    // period labels under the timeline, as many as fit
    const lfs = 10;
    const lw = d3.max(d3.range(n), i => ms.tw(frameLabel(i), lfs)) || 20;
    const every = Math.max(1, Math.ceil((lw + 10) / Math.max(1, (x1 - x0) / Math.max(1, n - 1))));
    const tickIdx = d3.range(n).filter(i => n <= 80 || i % Math.ceil(n / 80) === 0);
    ticksG.selectAll("line").data(tickIdx).enter().append("line")
      .attr("x1", i => tx(i)).attr("x2", i => tx(i)).attr("y1", cy - 2).attr("y2", cy + 2)
      .attr("stroke", bgcol).attr("stroke-width", 1).attr("stroke-opacity", 0.9);
    // the labels shown: every `every` frames, and the last one when it fits
    // (otherwise it replaces the one before it)
    const shown = d3.range(n).filter(i => i % every === 0);
    if (shown[shown.length - 1] !== n - 1) {
      if (tx(n - 1) - tx(shown[shown.length - 1]) < lw + 8 && shown.length > 1) shown.pop();
      shown.push(n - 1);
    }
    // keep the end labels clear of the play and speed buttons
    const lblX = i => {
      const w = ms.tw(frameLabel(i), lfs) / 2;
      return Math.max(x0 - 14 + w, Math.min(x1 + 14 - w, tx(i)));
    };
    ticksG.selectAll("text").data(shown)
      .enter().append("text").attr("x", lblX).attr("y", cy + 15).attr("text-anchor", "middle")
      .style("font-size", lfs + "px").style("fill", axisCol).style("fill-opacity", 0.55).style("font-family", font)
      .text(i => frameLabel(i));
    handle = track.append("circle").attr("cy", cy).attr("r", 7).attr("fill", bgcol)
      .attr("stroke", DD_ACCENT).attr("stroke-width", 2.5).style("cursor", "grab");
    hoverLbl = track.append("g").style("display", "none").style("pointer-events", "none");
    hoverLbl.append("rect").attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0.85).attr("height", 18).attr("y", cy - 31);
    hoverLbl.append("text").attr("y", cy - 22).attr("dy", "0.35em").attr("text-anchor", "middle")
      .style("font-size", "10.5px").style("font-weight", 600).style("fill", bgcol).style("font-family", font);
    // the hit area (drag to scrub, click to jump)
    const hit = track.append("rect").attr("x", x0 - 8).attr("width", x1 - x0 + 16).attr("y", cy - 12).attr("height", 24)
      .attr("fill", "transparent").style("cursor", "pointer");
    let wasPlaying = false;
    const showHover = px => {
      const tt = xt(px);
      const txt = label(tt);
      const w = ms.tw(txt, 10.5, 600) + 10;
      hoverLbl.style("display", null).attr("transform", `translate(${Math.max(x0, Math.min(x1, px))},0)`);
      hoverLbl.select("rect").attr("x", -w / 2).attr("width", w);
      hoverLbl.select("text").text(txt);
    };
    hit.on("mousemove", function (a) { const [px] = ddPtr(a, svgSel.node()); showHover(px); })
      .on("mouseleave", function () { hoverLbl.style("display", "none"); });
    const drag = d3.drag()
      .on("start", function (a) {
        const ev = ddEvOf(a);
        wasPlaying = playing;
        pause(true);
        handle.style("cursor", "grabbing");
        const px = ev.x !== undefined ? ev.x : ddPtr(a, svgSel.node())[0];
        seek(xt(px));
        showHover(px);
      })
      .on("drag", function (a) {
        const ev = ddEvOf(a);
        seek(xt(ev.x));
        showHover(ev.x);
      })
      .on("end", function () {
        handle.style("cursor", "grab");
        hoverLbl.style("display", "none");
        // when the drag ends between two periods, settle on the nearest one
        const target = Math.round(t);
        if (wasPlaying) play(); else seek(target, 250);
      });
    hit.call(drag);
    handle.call(drag);
    playBtn.on("click", function () { toggle(); });
  }

  function styleControls() {
    if (!showControls) return;
    const atEnd = t >= n - 1 - 1e-9 && !playing;
    // pause bars, play triangle, or a replay arrow at the end
    if (playing) playIcon.attr("d", "M-5,-6h3.6v12h-3.6zM1.4,-6h3.6v12h-3.6z").attr("fill", "white").attr("stroke", "none");
    else if (atEnd) playIcon.attr("d", "M5.5,0A5.5 5.5 0 1 1 3.9,-3.9M5.6,-7.2L4.3,-3.4L0.6,-4.6")
      .attr("fill", "none").attr("stroke", "white").attr("stroke-width", 2).attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
    else playIcon.attr("d", "M-4,-7L7,0L-4,7Z").attr("fill", "white").attr("stroke", "none");
    speedTxt.text((speed === 0.5 ? "0.5" : speed) + "×");
    loopG.select("rect.bg").attr("fill", loop ? DD_ACCENT : bgcol).attr("fill-opacity", loop ? 0.14 : 1);
    loopG.select("path.ic").attr("stroke", loop ? DD_ACCENT : axisCol).attr("stroke-opacity", loop ? 1 : 0.7);
    loopG.select("path.ar").attr("fill", loop ? DD_ACCENT : axisCol).attr("fill-opacity", loop ? 1 : 0.7);
  }
  function drawPos() {
    if (!showControls) return;
    fillBar.attr("x2", tx(t));
    handle.attr("cx", tx(t));
  }
  function render() {
    st.t = t;
    drawPos();
    cfg.onRender(t);
    const fi = Math.round(t);
    if (fi !== lastFrame) {
      lastFrame = fi;
      if (cfg.onFrame) cfg.onFrame(fi);
      send("frame", { index: fi + 1, label: frames[fi] });
    }
  }
  function tick(elapsed) {
    if (lastEl === null) { lastEl = elapsed; return; }
    const dt = Math.min(100, elapsed - lastEl);
    lastEl = elapsed;
    t += dt * speed / frameDur;
    if (t >= n - 1) {
      t = n - 1;
      render();
      if (loop) {
        stopTimer();
        endTimer = ddplotTrack(d3.timeout(() => { endTimer = null; t = 0; render(); if (playing) startTimer(); }, 1200));
      } else {
        pause();
      }
      return;
    }
    render();
  }
  function startTimer() {
    stopTimer();
    lastEl = null;
    timer = ddplotTrack(d3.timer(tick));
  }
  function stopTimer() {
    if (timer) { timer.stop(); timer = null; }
    if (endTimer) { endTimer.stop(); endTimer = null; }
  }
  function play() {
    if (n < 2) return;
    if (seekTimer) { seekTimer.stop(); seekTimer = null; }
    if (t >= n - 1 - 1e-9) { t = 0; render(); }
    playing = true;
    st.playing = true;
    startTimer();
    styleControls();
  }
  function pause(keepState) {
    playing = false;
    if (!keepState) st.playing = false;
    stopTimer();
    styleControls();
  }
  function toggle() { if (playing) pause(); else play(); }
  // jump to time `to`, optionally animated over `dur` milliseconds
  function seek(to, dur) {
    to = Math.max(0, Math.min(n - 1, to));
    if (seekTimer) { seekTimer.stop(); seekTimer = null; }
    if (!dur) { t = to; render(); styleControls(); return; }
    const from = t, e = d3.easeCubicInOut;
    seekTimer = ddplotTrack(d3.timer(el => {
      const k = Math.min(1, el / dur);
      t = from + (to - from) * e(k);
      render();
      if (k >= 1) { seekTimer.stop(); seekTimer = null; styleControls(); }
    }));
  }

  // keyboard: space = play / pause, arrows = step, Home / End
  svgSel.attr("tabindex", 0).style("outline", "none");
  svgSel.on("keydown.ddrace", function (a) {
    const ev = ddEvOf(a);
    if (!ev) return;
    const k = ev.key;
    if (k === " " || k === "Spacebar") { toggle(); ev.preventDefault(); }
    else if (k === "ArrowRight") { pause(); seek(Math.min(n - 1, Math.floor(t + 1e-6) + 1), 350); ev.preventDefault(); }
    else if (k === "ArrowLeft") { pause(); seek(Math.max(0, Math.ceil(t - 1e-6) - 1), 350); ev.preventDefault(); }
    else if (k === "Home") { pause(); seek(0, 400); ev.preventDefault(); }
    else if (k === "End") { pause(); seek(n - 1, 400); ev.preventDefault(); }
  });
  svgSel.on("mousedown.ddrace", function () { const nd = svgSel.node(); if (nd.focus) nd.focus({ preventScroll: true }); });

  function start() {
    styleControls();
    render();
    const resume = st.playing === true;
    const auto = o.autoplay !== false && st.started === undefined;
    st.started = true;
    if (n < 2) return;
    if (resume) { play(); return; }
    if (!auto) return;
    // a chart that starts on its last period (startFrame = "last") waits for the reader
    if (t >= n - 1 - 1e-9) return;
    // start playing when the chart scrolls into view
    const go = () => { if (!playing && st.playing !== false) play(); };
    if (typeof IntersectionObserver === "function") {
      const obs = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.4)) {
          obs.disconnect();
          ddplotTrack(d3.timeout(go, 500));
        }
      }, { threshold: [0, 0.4, 1] });
      obs.observe(svgSel.node());
      ddplotTrack({ stop() { obs.disconnect(); } });
    } else {
      ddplotTrack(d3.timeout(go, 700));
    }
  }

  return {
    n, height, top, ease, label, frameLabel,
    t: () => t,
    frameIndex: tt => Math.round(Math.max(0, Math.min(n - 1, tt === undefined ? t : tt))),
    seek, play, pause, toggle, start,
    playing: () => playing,
    render: () => render()
  };
}

// The big faded period label drawn behind a chart.
function ddWatermark(parent, cfg) {
  return parent.append("text").attr("class", "dd-watermark")
    .attr("x", cfg.x).attr("y", cfg.y).attr("text-anchor", cfg.anchor || "end")
    .style("font-size", cfg.size + "px").style("font-weight", 800)
    .style("font-family", cfg.font).style("fill", cfg.color)
    .style("fill-opacity", cfg.opacity === undefined ? 0.12 : cfg.opacity)
    .style("font-variant-numeric", "tabular-nums").style("pointer-events", "none");
}

// Title and subtitle at the top left; returns the y where the chart can start.
function ddTitles(svgSel, o, axisCol, padL) {
  let top = 14;
  if (o.title) {
    svgSel.append("text").attr("x", padL).attr("y", top + o.titleFontSize * 0.8)
      .style("font-size", o.titleFontSize + "px").style("font-weight", 700)
      .style("fill", axisCol).text(o.title);
    top += o.titleFontSize + 6;
  }
  if (o.subtitle) {
    svgSel.append("text").attr("x", padL).attr("y", top + o.subtitleFontSize * 0.8)
      .style("font-size", o.subtitleFontSize + "px").style("fill", axisCol)
      .style("opacity", 0.65).text(o.subtitle);
    top += o.subtitleFontSize + 6;
  }
  return top;
}
