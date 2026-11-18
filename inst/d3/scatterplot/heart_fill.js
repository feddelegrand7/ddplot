// heart_fill() -- a beating heart filled with a wavy liquid up to a level.
// Uses playkit.js (prepended by play_script()).

const o = options || {};
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = o.bgcol || "white";
const fillColor = o.fillColor || "#e63950";
const strokeColor = o.strokeColor || "#b5172b";
const strokeWidth = pkNum(o.strokeWidth, 3);
const labelColor = o.labelColor || "#333333";
const titleColor = o.titleColor || "#333333";
const level = pkClamp(pkNum(o.level, 0), 0, 1);
const target = pkNum(o.target, null);
const send = pkShiny(svg);
const tw = pkMeasure(svg, font);
const uid = pkUid("heart");

svg.style("background-color", bgcol).style("font-family", font)
  .attr("role", "img").attr("aria-label", (o.titleText ? o.titleText + ": " : "") + pkPct(level));

// ---- geometry ------------------------------------------------------------------------
// the classic parametric heart, normalised to a width of 1 (y grows downwards)
const raw = d3.range(0, 2 * Math.PI, Math.PI / 90).map(t => [
  16 * Math.pow(Math.sin(t), 3),
  -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
]);
const rx = d3.extent(raw, p => p[0]), ry = d3.extent(raw, p => p[1]);
const aspect = (ry[1] - ry[0]) / (rx[1] - rx[0]);

const titleFs = pkPx(o.titleFontSize, 14);
const hasTitle = !!o.titleText;
const bottomSpace = hasTitle ? titleFs + 22 : 10;
const targetSpace = target !== null ? 70 : 0;
const maxS = Math.max(20, Math.min((W - 2 * targetSpace - 24), (H - bottomSpace - 30) / aspect));
const S = o.heartSize ? Math.min(pkPx(o.heartSize, maxS), maxS) : Math.min(maxS, 360);
const HH = S * aspect;
const cx = W / 2;
const top = Math.max(12, (H - bottomSpace - HH) / 2 + 4);
const pts = raw.map(p => [(p[0] - rx[0]) / (rx[1] - rx[0]) * S - S / 2, (p[1] - ry[0]) / (ry[1] - ry[0]) * HH]);
const heartD = d3.line().curve(d3.curveCatmullRomClosed)(pts);
// level -> y inside the heart group (0 = bottom tip, 1 = top of the lobes)
const yOf = v => HH - v * HH;

// ---- defs -----------------------------------------------------------------------------
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "c").append("path").attr("d", heartD);
const textClip = defs.append("clipPath").attr("id", uid + "t").append("path");
const lg = defs.append("linearGradient").attr("id", uid + "g").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
lg.append("stop").attr("offset", "0%").attr("stop-color", d3.color(fillColor).brighter(0.45));
lg.append("stop").attr("offset", "100%").attr("stop-color", d3.color(fillColor).darker(0.35));
const sh = defs.append("filter").attr("id", uid + "s").attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "170%");
sh.append("feDropShadow").attr("dx", 0).attr("dy", S * 0.035).attr("stdDeviation", S * 0.035)
  .attr("flood-color", fillColor).attr("flood-opacity", 0.28);

// ---- drawing --------------------------------------------------------------------------
const root = svg.append("g").attr("transform", `translate(${cx},${top})`);
const beatG = root.append("g");
const shapeG = beatG.append("g").attr("filter", `url(#${uid}s)`);
shapeG.append("path").attr("d", heartD).attr("fill", pkMix(fillColor, bgcol, 0.88));
const liquid = shapeG.append("g").attr("clip-path", `url(#${uid}c)`);
const backWave = liquid.append("path").attr("fill", pkMix(fillColor, "#ffffff", 0.45)).attr("fill-opacity", 0.75);
const frontWave = liquid.append("path").attr("fill", `url(#${uid}g)`);
// a soft gloss on the left lobe
const gloss = beatG.append("g").attr("clip-path", `url(#${uid}c)`).style("pointer-events", "none");
gloss.append("ellipse").attr("cx", -S * 0.27).attr("cy", HH * 0.2).attr("rx", S * 0.1).attr("ry", S * 0.05)
  .attr("transform", `rotate(-38,${-S * 0.27},${HH * 0.2})`).attr("fill", "white").attr("fill-opacity", 0.5);
gloss.append("circle").attr("cx", -S * 0.15).attr("cy", HH * 0.1).attr("r", S * 0.018).attr("fill", "white").attr("fill-opacity", 0.6);
beatG.append("path").attr("d", heartD).attr("fill", "none").attr("stroke", strokeColor)
  .attr("stroke-width", strokeWidth).attr("stroke-linejoin", "round");

// target
if (target !== null) {
  const ty = yOf(target);
  const tg = beatG.append("g").style("pointer-events", "none");
  tg.append("line").attr("x1", -S * 0.56).attr("x2", S * 0.56).attr("y1", ty).attr("y2", ty)
    .attr("stroke", labelColor).attr("stroke-width", 1.4).attr("stroke-dasharray", "5,4").attr("stroke-opacity", 0.7);
  tg.append("text").attr("x", S * 0.56 + 6).attr("y", ty).attr("dy", "-0.15em")
    .style("font-size", "11px").style("fill", labelColor).style("fill-opacity", 0.7).text("Target");
  tg.append("text").attr("x", S * 0.56 + 6).attr("y", ty).attr("dy", "1.05em")
    .style("font-size", "12px").style("font-weight", 700).style("fill", labelColor).text(pkPct(target));
}

// the percentage, drawn twice: dark over the empty part, white over the liquid
const labelFs = pkPx(o.labelFontSize, Math.max(12, S * 0.17));
const labelY = HH * 0.43;
const labels = [];
if (o.renderFillLabel !== false) {
  [{ c: labelColor, clip: null }, { c: "white", clip: `url(#${uid}t)` }].forEach(spec => {
    const t = beatG.append("text").attr("x", 0).attr("y", labelY).attr("text-anchor", "middle")
      .attr("dy", "0.35em").style("font-size", labelFs + "px").style("font-weight", 700)
      .style("font-variant-numeric", "tabular-nums").style("fill", spec.c).style("pointer-events", "none");
    if (spec.clip) t.attr("clip-path", spec.clip);
    labels.push(t);
  });
}
if (hasTitle) {
  svg.append("text").attr("x", cx).attr("y", top + HH + 20 + titleFs * 0.8).attr("text-anchor", "middle")
    .style("font-size", titleFs + "px").style("fill", titleColor).style("fill-opacity", 0.8).text(o.titleText);
}
const hint = svg.append("text").attr("x", cx).attr("y", H - 6).attr("text-anchor", "middle")
  .style("font-size", "10.5px").style("fill", labelColor).style("fill-opacity", 0).style("pointer-events", "none")
  .text(o.draggable ? "Drag or use the arrow keys to change the level" : "");

// ---- state --------------------------------------------------------------------------
const st = pkState("heart");
const startFrom = (st.level !== undefined) ? st.level : (o.animate === false ? level : 0);
const lv = pkTween(startFrom);
st.level = level;
let hover = 0, hoverTo = 0;
const waves = o.waves !== false && !pkCalm;
const beat = o.beat !== false && !pkCalm;
const bpm = pkNum(o.bpm, 60);
let beatPhase = 0, lastNow = pkNow();

// liquid surface at level v
function waveD(v, now, phase, amp) {
  const y0 = yOf(v);
  const a = amp * Math.min(1, v * 10, (1 - v) * 10);
  const lam = S * 0.55;
  const p = [];
  for (let x = -S / 2 - 4; x <= S / 2 + 4; x += 4) {
    p.push([x, y0 + a * Math.sin(2 * Math.PI * x / lam + now / 1000 * 2.2 + phase)]);
  }
  return "M" + p.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") +
    `L${S / 2 + 4},${HH + 6}L${-S / 2 - 4},${HH + 6}Z`;
}
// lub-dub
function pulse(ph) {
  return Math.exp(-Math.pow((ph - 0.06) / 0.045, 2)) + 0.55 * Math.exp(-Math.pow((ph - 0.27) / 0.05, 2));
}

const loop = pkLoop(svg, now => {
  const dt = Math.min(100, now - lastNow); lastNow = now;
  hover += (hoverTo - hover) * Math.min(1, dt / 120);
  const v = lv.get(now);
  const amp = waves ? S * 0.022 : 0;
  backWave.attr("d", waveD(v, now, 2.1, amp * 0.9));
  const fd = waveD(v, now * 1.25, 0, amp);
  frontWave.attr("d", fd);
  textClip.attr("d", fd);
  labels.forEach(t => t.text(pkPct(v)));
  if (beat) {
    beatPhase = (beatPhase + dt / 1000 * bpm * (1 + 0.8 * hover) / 60) % 1;
    const s = 1 + (0.035 + 0.02 * hover) * pulse(beatPhase);
    beatG.attr("transform", `translate(0,${HH / 2}) scale(${s}) translate(0,${-HH / 2})`);
  }
});
loop.onVisible(() => {
  if (lv.target() !== level || startFrom !== level) {
    lv.set(startFrom, 0);
    lv.set(level, startFrom === 0 ? 1600 : 900);
  }
});

function setLevel(v, instant) {
  lv.set(v, instant ? 120 : 450);
  st.level = v;
  svg.attr("aria-label", (o.titleText ? o.titleText + ": " : "") + pkPct(v));
}

// ---- interactions -------------------------------------------------------------------
const hit = beatG.append("path").attr("d", heartD).attr("fill", "transparent").style("cursor", "pointer");
hit.on("mouseenter", () => { hoverTo = 1; if (o.draggable) hint.transition().duration(250).style("fill-opacity", 0.55); })
  .on("mouseleave", () => { hoverTo = 0; hint.transition().duration(400).style("fill-opacity", 0); })
  .on("click", function (a) {
    const p = pkPtr(a, root.node());
    burst(p[0], p[1]);
    send("clicked", { value: lv.target() });
  });
if (o.draggable) {
  pkLevelInput(svg, hit, {
    yToLevel: y => (top + HH - y) / HH,
    onLevel: setLevel,
    current: () => lv.target(),
    send
  });
}

// little hearts floating up from the click
const mini = d3.line().curve(d3.curveCatmullRomClosed)(raw.map(p => [p[0] / 32, p[1] / 32]));
function burst(x, y) {
  if (pkCalm) return;
  const n = 9;
  for (let k = 0; k < n; k++) {
    const sz = S * (0.07 + Math.random() * 0.07) * 1.6;
    const dx = (Math.random() - 0.5) * S * 0.9, dy = -S * (0.35 + Math.random() * 0.45);
    const rot = (Math.random() - 0.5) * 60;
    const col = k % 3 === 0 ? pkMix(fillColor, "#ffffff", 0.45) : fillColor;
    root.append("path").attr("d", mini).attr("fill", col).style("pointer-events", "none")
      .attr("transform", `translate(${x},${y}) scale(0.2)`).attr("opacity", 0.95)
      .transition().duration(900 + Math.random() * 700).ease(d3.easeCubicOut)
      .attr("transform", `translate(${x + dx},${y + dy}) rotate(${rot}) scale(${sz})`)
      .attr("opacity", 0).remove();
  }
}
