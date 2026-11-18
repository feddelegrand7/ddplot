// flame() -- a flickering flame whose height follows an intensity, with a glow,
// rising sparks, wind from the mouse and an optional candle or logs.
// Uses playkit.js (prepended by play_script()).

const o = options || {};
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = o.bgcol || "white";
const c0 = o.flameColor0 || "#fffbe6";
const c1 = o.flameColor1 || "#ffc233";
const c2 = o.flameColor2 || "#e8452c";
const outline = o.flameOutline || null;
const labelColor = o.labelColor || (d3.hsl(bgcol).l < 0.5 ? "#f2f2f2" : "#333333");
const maxI = pkNum(o.maxIntensity, 100);
let intensity = Math.max(0, pkNum(o.intensity, 50));
const baseType = o.base || "none";
const send = pkShiny(svg);
const uid = pkUid("flame");
const dark = d3.hsl(bgcol).l < 0.5;

svg.style("background-color", bgcol).style("font-family", font)
  .attr("role", "img").attr("aria-label", "Flame, intensity " + intensity);

// ---- layout ---------------------------------------------------------------------------
const titleFs = pkPx(o.titleFontSize, 14);
const valueFs = pkPx(o.labelFontSize, Math.max(16, Math.min(34, H * 0.07)));
const bottomText = (o.showValue ? valueFs + 8 : 0) + (o.titleText ? titleFs + 8 : 0);
const bottom = H - 10 - bottomText - (bottomText ? 10 : 0);
const baseH = baseType === "candle" ? Math.min(H * 0.3, 150) : baseType === "logs" ? Math.min(H * 0.12, 50) : 0;
const baseY = bottom - baseH - (baseType === "none" ? 6 : 0);   // where the flame sits
const maxFh = Math.max(30, (baseY - 14) / 1.12);
const cx = W / 2;
// flame height for an intensity (linear up to maxIntensity)
const kOf = i => pkClamp(i / maxI, 0, 1);
const fhOf = i => maxFh * (0.15 + 0.85 * kOf(i));

// ---- defs -----------------------------------------------------------------------------
const defs = svg.append("defs");
function vgrad(id, stops) {
  const g = defs.append("linearGradient").attr("id", uid + id).attr("x1", 0).attr("x2", 0).attr("y1", 1).attr("y2", 0);
  stops.forEach(s => g.append("stop").attr("offset", s[0]).attr("stop-color", s[1]).attr("stop-opacity", s[2] === undefined ? 1 : s[2]));
}
vgrad("o", [[0, pkMix(c1, c2, 0.35)], [0.45, c2], [1, c2, 0.85]]);
vgrad("m", [[0, pkMix(c0, c1, 0.4)], [0.5, c1], [1, pkMix(c1, c2, 0.3)]]);
vgrad("i", [[0, c0], [0.7, c0], [1, pkMix(c0, c1, 0.5)]]);
const glow = defs.append("radialGradient").attr("id", uid + "g");
glow.append("stop").attr("offset", "0%").attr("stop-color", c1).attr("stop-opacity", dark ? 0.55 : 0.4);
glow.append("stop").attr("offset", "55%").attr("stop-color", c2).attr("stop-opacity", dark ? 0.16 : 0.09);
glow.append("stop").attr("offset", "100%").attr("stop-color", c2).attr("stop-opacity", 0);
const blur = defs.append("filter").attr("id", uid + "b").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
const blurDev = blur.append("feGaussianBlur").attr("stdDeviation", 2);
const blurIn = defs.append("filter").attr("id", uid + "bi").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
const blurInDev = blurIn.append("feGaussianBlur").attr("stdDeviation", 3);

// ---- base (candle / logs) -------------------------------------------------------------
const scene = svg.append("g");
const glowE = scene.append("ellipse").attr("fill", `url(#${uid}g)`).style("pointer-events", "none");
const floorE = scene.append("ellipse").attr("fill", c1).style("pointer-events", "none");
const baseG = scene.append("g");
if (baseType === "candle") {
  const cw = Math.max(26, Math.min(70, W * 0.1));
  const cg = defs.append("linearGradient").attr("id", uid + "c");
  [[0, "#e9dcc3"], [0.35, "#fbf6ec"], [1, "#d9c7a6"]].forEach(s => cg.append("stop").attr("offset", s[0]).attr("stop-color", s[1]));
  const ry = cw * 0.16;
  baseG.append("ellipse").attr("cx", cx).attr("cy", bottom + 2).attr("rx", cw * 1.05).attr("ry", ry * 0.9)
    .attr("fill", "#000").attr("fill-opacity", dark ? 0.35 : 0.08);
  baseG.append("path").attr("d", `M${cx - cw / 2},${baseY + 4} L${cx - cw / 2},${bottom} A${cw / 2},${ry} 0 0 0 ${cx + cw / 2},${bottom} L${cx + cw / 2},${baseY + 4} Z`)
    .attr("fill", `url(#${uid}c)`);
  baseG.append("ellipse").attr("cx", cx).attr("cy", baseY + 4).attr("rx", cw / 2).attr("ry", ry).attr("fill", "#f6eedd")
    .attr("stroke", "#d9c7a6").attr("stroke-width", 1);
  // a drip of wax
  baseG.append("path").attr("d", `M${cx + cw * 0.18},${baseY + 4 + ry * 0.8} q${cw * 0.05},0 ${cw * 0.06},${baseH * 0.22} a${cw * 0.05},${cw * 0.05} 0 0 1 ${-cw * 0.1},0 q0,${-baseH * 0.12} ${cw * 0.04},${-baseH * 0.22}Z`)
    .attr("fill", "#f6eedd");
  baseG.append("line").attr("x1", cx).attr("x2", cx + 1).attr("y1", baseY + 4).attr("y2", baseY - 6)
    .attr("stroke", "#3a2a1a").attr("stroke-width", 2).attr("stroke-linecap", "round");
} else if (baseType === "logs") {
  const lw = Math.max(80, Math.min(220, W * 0.32)), lh = Math.max(12, baseH * 0.42);
  const lg = defs.append("linearGradient").attr("id", uid + "l").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
  [[0, "#8a5a36"], [0.5, "#6b4226"], [1, "#4a2c18"]].forEach(s => lg.append("stop").attr("offset", s[0]).attr("stop-color", s[1]));
  baseG.append("ellipse").attr("cx", cx).attr("cy", bottom - 2).attr("rx", lw * 0.6).attr("ry", lh * 0.5)
    .attr("fill", "#000").attr("fill-opacity", dark ? 0.35 : 0.08);
  [-11, 11].forEach((a, k) => {
    const g = baseG.append("g").attr("transform", `translate(${cx},${bottom - lh * 0.9}) rotate(${a})`);
    g.append("rect").attr("x", -lw / 2).attr("y", -lh / 2).attr("width", lw).attr("height", lh).attr("rx", lh / 2)
      .attr("fill", `url(#${uid}l)`);
    const ex = k ? lw / 2 - lh * 0.35 : -lw / 2 + lh * 0.35;
    g.append("ellipse").attr("cx", ex).attr("cy", 0).attr("rx", lh * 0.32).attr("ry", lh * 0.46).attr("fill", "#c9955f");
    g.append("ellipse").attr("cx", ex).attr("cy", 0).attr("rx", lh * 0.15).attr("ry", lh * 0.22).attr("fill", "none")
      .attr("stroke", "#8a5a36").attr("stroke-width", 1);
  });
  // embers glowing between the logs
  baseG.append("ellipse").attr("cx", cx).attr("cy", bottom - lh * 1.15).attr("rx", lw * 0.16).attr("ry", lh * 0.3)
    .attr("fill", c2).attr("fill-opacity", 0.85).attr("filter", `url(#${uid}b)`);
}
const flameG = scene.append("g").style("cursor", "pointer");
const outer = flameG.append("path").attr("fill", `url(#${uid}o)`).attr("filter", `url(#${uid}b)`);
const middle = flameG.append("path").attr("fill", `url(#${uid}m)`);
const inner = flameG.append("path").attr("fill", `url(#${uid}i)`).attr("filter", `url(#${uid}bi)`);
const outlineP = outline ? flameG.append("path").attr("fill", "none").attr("stroke", outline).attr("stroke-width", 1.5)
  .attr("stroke-opacity", 0.9) : null;
const sparkG = scene.append("g").style("pointer-events", "none");

let valueText = null;
if (o.showValue) {
  valueText = svg.append("text").attr("x", cx).attr("y", bottom + 16 + valueFs * 0.85).attr("text-anchor", "middle")
    .style("font-size", valueFs + "px").style("font-weight", 700).style("fill", labelColor)
    .style("font-variant-numeric", "tabular-nums");
}
if (o.titleText) {
  svg.append("text").attr("x", cx).attr("y", H - 10 - titleFs * 0.2).attr("text-anchor", "middle")
    .style("font-size", titleFs + "px").style("fill", o.titleColor || labelColor).style("fill-opacity", 0.8).text(o.titleText);
}
const fmt = v => {
  const r = Math.abs(v) >= 100 || Number.isInteger(intensity) ? Math.round(v) : Math.round(v * 10) / 10;
  return d3.format(",")(r) + (o.valueSuffix || "");
};

// ---- shape ----------------------------------------------------------------------------
// half width along the flame (u = 0 at the base, 1 at the tip)
function halfW(u) {
  return u < 0.28 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.28 - u) / 0.28, 2)))
    : Math.pow((1 - u) / 0.72, 1.25);
}
function flameD(fh, fw, t, ph, flick, windK, lift) {
  const N = 26, L = [], R = [];
  const hh = fh * (1 + flick * (0.06 * Math.sin(t * 5.1 + ph) + 0.04 * Math.sin(t * 11.3 + ph * 2)));
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const off = fw * Math.pow(u, 1.5) * flick *
      (0.2 * Math.sin(t * 3.3 + u * 5 + ph) + 0.11 * Math.sin(t * 7.7 - u * 9 + ph) + 0.05 * Math.sin(t * 14 + u * 16))
      + windK * fw * 1.1 * Math.pow(u, 1.6);
    const w = fw / 2 * halfW(u);
    const y = baseY - lift - u * hh;
    L.push([cx + off - w, y]);
    R.push([cx + off + w, y]);
  }
  return d3.line().curve(d3.curveCatmullRomClosed)(L.concat(R.slice(1, N).reverse()));
}

// ---- animation ----------------------------------------------------------------------
const st = pkState("flame");
const startFrom = (st.intensity !== undefined) ? st.intensity : (o.animate === false ? intensity : 0);
const iv = pkTween(startFrom);
st.intensity = intensity;
const calm = pkCalm || o.flicker === false;
let wind = 0, windTo = 0, flare = 0, lastNow = pkNow();
const sparks = [];
const showSparks = o.sparks !== false && !pkCalm;

function spawn(n, fh, fw) {
  for (let k = 0; k < n; k++) {
    sparks.push({ x: cx + (Math.random() - 0.5) * fw * 0.5, y: baseY - fh * (0.35 + Math.random() * 0.45),
      vx: (Math.random() - 0.5) * 18, vy: -(35 + Math.random() * 70) * Math.max(0.6, fh / 200),
      r: 0.8 + Math.random() * 1.6, life: 0, max: 0.8 + Math.random() * 1.2, ph: Math.random() * 6 });
  }
}

const loop = pkLoop(svg, now => {
  const dt = Math.min(50, now - lastNow) / 1000; lastNow = now;
  const t = now / 1000;
  wind += (windTo - wind) * Math.min(1, dt * 4);
  flare *= Math.exp(-dt * 1.8);
  const i = iv.get(now);
  const k = kOf(i);
  const fh = fhOf(i) * (1 + 0.32 * flare) * (i <= 0 ? 0 : 1);
  const fw = fh * 0.42 + 6;
  const flick = calm ? 0 : (0.75 + 0.5 * k + 0.6 * flare);
  const ts = t * (0.9 + 0.5 * k + 0.4 * flare);
  outer.attr("d", fh > 0 ? flameD(fh, fw, ts, 0, flick, wind, 0) : null);
  middle.attr("d", fh > 0 ? flameD(fh * 0.72, fw * 0.66, ts * 1.1, 1.3, flick * 0.8, wind * 0.8, fh * 0.01) : null);
  inner.attr("d", fh > 0 ? flameD(fh * 0.38, fw * 0.36, ts * 1.2, 2.6, flick * 0.5, wind * 0.6, fh * 0.02) : null);
  if (outlineP) outlineP.attr("d", outer.attr("d"));
  blurDev.attr("stdDeviation", Math.max(0.8, fw * 0.025));
  blurInDev.attr("stdDeviation", Math.max(1, fw * 0.06));
  const pulse = calm ? 1 : 1 + 0.06 * Math.sin(t * 9.3) + 0.04 * Math.sin(t * 4.1);
  glowE.attr("cx", cx + wind * fw * 0.3).attr("cy", baseY - fh * 0.42).attr("rx", (fw * 1.6 + 30) * pulse)
    .attr("ry", (fh * 0.85 + 20) * pulse).style("display", fh > 0 ? null : "none");
  floorE.attr("cx", cx).attr("cy", baseY + 3).attr("rx", fw * 0.75 * pulse).attr("ry", Math.max(2, fw * 0.12))
    .attr("fill-opacity", (dark ? 0.35 : 0.18) * Math.min(1, fh / 40)).style("display", baseType === "none" && fh > 0 ? null : "none");
  // sparks
  if (showSparks && fh > 0 && Math.random() < dt * (1.5 + 9 * k + 25 * flare)) spawn(1, fh, fw);
  for (let n = sparks.length - 1; n >= 0; n--) {
    const s = sparks[n];
    s.life += dt;
    s.x += (s.vx + wind * 60 + Math.sin(t * 6 + s.ph) * 14) * dt;
    s.y += s.vy * dt;
    if (s.life > s.max || s.y < 0) sparks.splice(n, 1);
  }
  const sel = sparkG.selectAll("circle").data(sparks);
  sel.exit().remove();
  sel.enter().append("circle").merge(sel).attr("cx", s => s.x).attr("cy", s => s.y)
    .attr("r", s => s.r * (1 - s.life / s.max * 0.6))
    .attr("fill", s => s.life / s.max < 0.4 ? c1 : c2).attr("fill-opacity", s => 1 - s.life / s.max);
  if (valueText) valueText.text(fmt(i));
});
loop.onVisible(() => {
  if (startFrom !== intensity) {
    iv.set(startFrom, 0);
    iv.set(intensity, startFrom === 0 ? 1300 : 800);
    if (startFrom === 0 && showSparks) ddplotTrack(d3.timeout(() => spawn(10, fhOf(intensity), fhOf(intensity) * 0.42), 300));
  }
});

// ---- interactions -------------------------------------------------------------------
// the flame leans away from the mouse
svg.on("mousemove.wind", function (a) {
  if (calm) return;
  const p = pkPtr(a, svg.node());
  const fh = fhOf(iv.get(pkNow()));
  const dx = p[0] - cx, dy = p[1] - (baseY - fh / 2);
  const near = Math.exp(-Math.hypot(dx, dy) / Math.max(80, fh * 0.9));
  windTo = -Math.sign(dx) * Math.min(1, Math.abs(dx) / 60) * near * 0.8;
}).on("mouseleave.wind", () => { windTo = 0; });

const hit = scene.append("rect").attr("fill", "transparent").style("cursor", "pointer")
  .attr("x", cx - maxFh * 0.4).attr("width", maxFh * 0.8).attr("y", baseY - maxFh * 1.05).attr("height", maxFh * 1.05 + baseH);
hit.on("click", () => {
  flare = 1;
  if (showSparks) { const fh = fhOf(iv.get(pkNow())); spawn(18, fh, fh * 0.42); }
  send("clicked", { intensity: iv.target() });
});
if (o.draggable) {
  pkLevelInput(svg, hit, {
    yToLevel: y => ((baseY - y) / maxFh - 0.15) / 0.85,
    onLevel: (v, instant) => {
      intensity = Math.round(v * maxI * 100) / 100;
      iv.set(intensity, instant ? 120 : 400);
      st.intensity = intensity;
      svg.attr("aria-label", "Flame, intensity " + intensity);
    },
    current: () => kOf(iv.target()),
    send: (name, v) => send(name, Math.round(v * maxI * 100) / 100)
  });
}
