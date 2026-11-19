// hair_growth() -- a portrait whose hair grows with a level: bald at 0, then
// stubble, a buzz cut, short curls and finally a big afro at 1. The eyes follow
// the mouse, the face blinks and smiles more as the hair grows, and the afro
// bounces when clicked. Uses playkit.js (prepended by play_script()).

const o = options || {};
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = o.bgcol || "white";
const hairColor = o.hairColor || "#2e2530";
const skinColor = o.skinColor || "#a86b4f";
const shirtColor = o.shirtColor || "#3f51b5";
const panelColor = o.panelColor || null;
const labelColor = o.labelColor || "#333333";
const titleColor = o.titleColor || "#333333";
const level = pkClamp(pkNum(o.level, 0), 0, 1);
const target = pkNum(o.target, null);
const send = pkShiny(svg);
const uid = pkUid("hair");
const STAGES = [[0.03, "Bald"], [0.12, "Stubble"], [0.3, "Buzz cut"], [0.5, "Short curls"],
  [0.72, "Curly"], [0.9, "Afro"], [1.01, "Big afro"]];
const stageOf = g => STAGES.find(s => g < s[0])[1];
const ariaOf = v => (o.titleText ? o.titleText + ": " : "") + pkPct(v) + " grown, " + stageOf(v);
const ramp = (v, a, b) => pkClamp((v - a) / (b - a), 0, 1);
const lerp = (a, b, k) => a + (b - a) * k;

svg.style("background-color", bgcol).style("font-family", font)
  .attr("role", "img").attr("aria-label", ariaOf(level));

// ---- layout ---------------------------------------------------------------------------
// The portrait is drawn in its own units (the head is 100 units wide) inside a
// 300 x 385 card, scaled to fit the chart.
const titleFs = pkPx(o.titleFontSize, 14);
const hasTitle = !!o.titleText;
const showLabel = o.renderFillLabel !== false;
const labelFs = pkPx(o.labelFontSize, Math.max(16, Math.min(34, H * 0.065)));
const topSpace = showLabel ? labelFs + 34 : 8;
const bottomSpace = hasTitle ? titleFs + 20 : 8;
const CX0 = -150, CY0 = -170, CW = 300, CH = 385;
const s = Math.max(0.1, Math.min((W - 16) / CW, (H - topSpace - bottomSpace - 6) / CH));
const X0 = W / 2;
const Y0 = topSpace + (H - topSpace - bottomSpace - CH * s) / 2 - CY0 * s;
const toScreen = (x, y) => [X0 + x * s, Y0 + y * s];

// ---- colours & defs ---------------------------------------------------------------------
const skinDark = d3.color(skinColor).darker(0.35).toString();
const skinDeep = d3.color(skinColor).darker(0.7).toString();
const hairLight = pkMix(hairColor, "#ffffff", 0.22);
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "card").append("rect")
  .attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH).attr("rx", 22);
// a little larger than the head, so no skin shows at the edge of the hair
defs.append("clipPath").attr("id", uid + "head").append("ellipse").attr("cx", 0).attr("cy", 0).attr("rx", 51.4).attr("ry", 63.4);
const stub = defs.append("pattern").attr("id", uid + "stub").attr("patternUnits", "userSpaceOnUse")
  .attr("width", 3.4).attr("height", 3.4);
stub.append("circle").attr("cx", 1).attr("cy", 1).attr("r", 0.75).attr("fill", hairColor);
stub.append("circle").attr("cx", 2.7).attr("cy", 2.6).attr("r", 0.65).attr("fill", hairColor);
const shine = defs.append("radialGradient").attr("id", uid + "shine");
shine.append("stop").attr("offset", "0%").attr("stop-color", "#fff").attr("stop-opacity", 0.75);
shine.append("stop").attr("offset", "100%").attr("stop-color", "#fff").attr("stop-opacity", 0);

// ---- drawing --------------------------------------------------------------------------
const scene = svg.append("g").attr("transform", `translate(${X0},${Y0}) scale(${s})`);
const card = scene.append("g").attr("clip-path", `url(#${uid}card)`);
if (panelColor) {
  card.append("rect").attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH).attr("fill", panelColor);
}
const sway = card.append("g");                 // everything that breathes with the body
const hairG = sway.append("g");                // the hair behind the head (bounces)
const mass = hairG.append("path").attr("fill", hairColor);
const curlG = hairG.append("g").attr("fill", "none").attr("stroke", hairLight).attr("stroke-linecap", "round");
const ghost = sway.append("path").attr("fill", "none").attr("stroke", labelColor).attr("stroke-opacity", 0.55)
  .attr("stroke-width", 1.6 / s).attr("stroke-dasharray", `${6 / s},${4 / s}`).style("pointer-events", "none");

// body: shoulders, neck and a turtleneck
const body = sway.append("g");
body.append("path").attr("fill", shirtColor)
  .attr("d", "M-132,230 C-132,150 -100,112 -40,101 L40,101 C100,112 132,150 132,230 Z");
body.append("path").attr("fill", d3.color(shirtColor).darker(0.25)).attr("fill-opacity", 0.5)
  .attr("d", "M-62,106 C-70,150 -66,190 -60,230 L-74,230 C-82,190 -84,140 -62,106 Z M62,106 C70,150 66,190 60,230 L74,230 C82,190 84,140 62,106 Z");
body.append("rect").attr("x", -17).attr("y", 30).attr("width", 34).attr("height", 52).attr("fill", skinDark);
body.append("ellipse").attr("cx", 0).attr("cy", 50).attr("rx", 18).attr("ry", 9).attr("fill", skinDeep).attr("fill-opacity", 0.45);
const collar = body.append("g");
collar.append("rect").attr("x", -31).attr("y", 70).attr("width", 62).attr("height", 38).attr("rx", 13)
  .attr("fill", d3.color(shirtColor).brighter(0.3));
d3.range(-22, 23, 5.5).forEach(x => collar.append("line").attr("x1", x).attr("x2", x).attr("y1", 76).attr("y2", 103)
  .attr("stroke", d3.color(shirtColor).darker(0.4)).attr("stroke-opacity", 0.45).attr("stroke-width", 1.6)
  .attr("stroke-linecap", "round"));

// head
const headG = sway.append("g");
[-1, 1].forEach(sd => {
  headG.append("ellipse").attr("cx", sd * 49).attr("cy", 6).attr("rx", 9).attr("ry", 12).attr("fill", skinDark);
  headG.append("ellipse").attr("cx", sd * 50).attr("cy", 6).attr("rx", 4).attr("ry", 6.5).attr("fill", skinDeep).attr("fill-opacity", 0.35);
});
headG.append("ellipse").attr("cx", 0).attr("cy", 0).attr("rx", 50).attr("ry", 62).attr("fill", skinColor);
// the front of the hair, over the forehead (clipped to the head)
const capG = headG.append("g").attr("clip-path", `url(#${uid}head)`);
const capStub = capG.append("path").attr("fill", `url(#${uid}stub)`);
const capSolid = capG.append("path").attr("fill", hairColor);
const shineEl = headG.append("ellipse").attr("cx", -17).attr("cy", -42).attr("rx", 15).attr("ry", 8)
  .attr("transform", "rotate(-28,-17,-42)").attr("fill", `url(#${uid}shine)`);

// face
const face = headG.append("g");
const cheeks = face.append("g").attr("fill", "#ff7a6b");
[-1, 1].forEach(sd => cheeks.append("ellipse").attr("cx", sd * 30).attr("cy", 17).attr("rx", 8).attr("ry", 5));
const brows = [-1, 1].map(() => face.append("path").attr("fill", "none").attr("stroke", hairColor)
  .attr("stroke-width", 3).attr("stroke-linecap", "round"));
const eyes = [-1, 1].map(sd => {
  const g = face.append("g");
  g.append("ellipse").attr("rx", 4).attr("ry", 5).attr("fill", "#231816");
  g.append("circle").attr("cx", 1.3).attr("cy", -1.8).attr("r", 1.2).attr("fill", "white").attr("fill-opacity", 0.9);
  return { g, sd };
});
face.append("path").attr("d", "M-3,12 Q0,17 3,12").attr("fill", "none").attr("stroke", skinDeep)
  .attr("stroke-width", 2).attr("stroke-linecap", "round").attr("stroke-opacity", 0.8);
const mouth = face.append("path").attr("fill", "white").attr("stroke", skinDeep).attr("stroke-width", 1.4)
  .attr("stroke-linejoin", "round");

// the afro pick, stuck in a full afro
const pick = sway.append("g").style("pointer-events", "none");
pick.append("rect").attr("x", -5).attr("y", -30).attr("width", 10).attr("height", 22).attr("rx", 4).attr("fill", "#e5484d");
pick.append("circle").attr("cx", 0).attr("cy", -24).attr("r", 2.6).attr("fill", "white").attr("fill-opacity", 0.8);
pick.append("rect").attr("x", -11).attr("y", -9).attr("width", 22).attr("height", 5).attr("rx", 2).attr("fill", "#c7363b");
d3.range(-9, 10, 4.5).forEach(x => pick.append("rect").attr("x", x - 1).attr("y", -5).attr("width", 2).attr("height", 9)
  .attr("rx", 1).attr("fill", "#c7363b"));

// ---- labels ---------------------------------------------------------------------------------
let pctText = null, stageText = null;
if (showLabel) {
  const lt = svg.append("text").attr("x", W / 2).attr("y", 8 + labelFs * 0.85).attr("text-anchor", "middle")
    .style("fill", labelColor).style("font-variant-numeric", "tabular-nums");
  pctText = lt.append("tspan").style("font-size", labelFs + "px").style("font-weight", 700);
  lt.append("tspan").attr("dx", 5).style("font-size", Math.max(11, labelFs * 0.45) + "px").style("fill-opacity", 0.6).text("grown");
  stageText = svg.append("text").attr("x", W / 2).attr("y", 8 + labelFs * 0.85 + 19).attr("text-anchor", "middle")
    .style("font-size", "11.5px").style("font-weight", 700).style("letter-spacing", "0.06em")
    .style("fill", labelColor).style("fill-opacity", 0.65).style("text-transform", "uppercase");
}
if (hasTitle) {
  svg.append("text").attr("x", W / 2).attr("y", Y0 + (CY0 + CH) * s + 14 + titleFs * 0.8).attr("text-anchor", "middle")
    .style("font-size", titleFs + "px").style("fill", titleColor).style("fill-opacity", 0.8).text(o.titleText);
}
if (target !== null) {
  const [tx, ty] = toScreen(CX0 + CW - 12, CY0 + 14);
  const tg = svg.append("g").attr("transform", `translate(${tx},${ty})`).style("pointer-events", "none");
  tg.append("text").attr("text-anchor", "end").attr("dy", "0.9em").style("font-size", "11px")
    .style("fill", labelColor).style("fill-opacity", 0.75).text("Target");
  tg.append("text").attr("text-anchor", "end").attr("dy", "2.15em").style("font-size", "12px")
    .style("font-weight", 700).style("fill", labelColor).text(pkPct(target));
}

// ---- the shape of the hair ------------------------------------------------------------------
// The afro is a bumpy ellipse around the head: each bump is a small arc between
// two points of the ellipse. It grows wider, taller and curlier with the level.
function massGeom(g) {
  const rx = 52 + 76 * Math.pow(g, 1.4);
  const top = -65 - 80 * Math.pow(g, 1.2);
  const bot = lerp(-10, 100, Math.pow(g, 1.15));
  return { rx, ry: (bot - top) / 2, cy: (top + bot) / 2, top, bot };
}
function massPath(g, now, wob) {
  const m = massGeom(g);
  const n = 30;
  const kr = lerp(0.95, 0.56, g);   // smaller arcs = rounder curls
  const pts = d3.range(n).map(k => {
    const a = -Math.PI / 2 + 2 * Math.PI * k / n;
    const r = 1 + wob * 0.016 * g * Math.sin(now / 1100 + k * 2.1);
    return [m.rx * r * Math.cos(a), m.cy + m.ry * r * Math.sin(a)];
  });
  let d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
  for (let k = 1; k <= n; k++) {
    const p = pts[k % n], q = pts[k - 1];
    const R = Math.hypot(p[0] - q[0], p[1] - q[1]) * kr;
    d += `A${R.toFixed(1)},${R.toFixed(1)} 0 0 1 ${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  }
  return d + "Z";
}
// the front of the hair: everything above a curly hairline
function capPath() {
  const yb = -34;
  const hy = x => yb + 24 * Math.pow(Math.min(1, Math.abs(x) / 52), 3);
  const n = 10;
  let d = `M-60,-80 L60,-80 L60,${hy(60)}`;
  for (let k = 1; k <= n; k++) {
    const x = 56 - 112 * k / n, px = 56 - 112 * (k - 1) / n;
    const R = Math.hypot(x - px, hy(x) - hy(px)) * 0.62;
    d += `${k === 1 ? `L56,${hy(56)}` : ""}A${R.toFixed(1)},${R.toFixed(1)} 0 0 1 ${x.toFixed(1)},${hy(x).toFixed(1)}`;
  }
  return d + `L-60,${hy(-60)}Z`;
}
capStub.attr("d", capPath());
capSolid.attr("d", capPath());
// curls inside the afro: fixed spots in the ellipse, scaled with it
const CURLS = d3.range(34).map(k => {
  const a = k * 2.39996 + 0.4, rr = 0.58 + 0.34 * ((k * 0.618) % 1);
  return { a, rr, rot: (k * 71) % 360, sz: 0.75 + 0.5 * ((k * 0.37) % 1) };
}).filter(c => !(Math.sin(c.a) > 0.15 && Math.abs(Math.cos(c.a)) * c.rr < 0.45));
const curlSel = curlG.selectAll("path").data(CURLS).enter().append("path");
if (target !== null) ghost.attr("d", massPath(target, 0, 0)).style("display", target > 0.06 ? null : "none");
else ghost.remove();

// ---- state & animation --------------------------------------------------------------
const st = pkState("hair");
const startFrom = (st.level !== undefined) ? st.level : (o.animate === false ? level : 0);
const lv = pkTween(startFrom);
st.level = level;
const swayOn = o.sway !== false && !pkCalm;
let lastNow = pkNow(), bounce = 0, bounceV = 0;
let look = [0, 0], lookTo = [0, 0];
let nextBlink = lastNow + 1800 + Math.random() * 2500, blinkUntil = 0, winkUntil = 0;

function draw(g, now) {
  const wob = swayOn ? 1 : 0;
  // the hair, squashed and stretched by the bounce
  const m = massGeom(g);
  const sy = 1 + bounce * 0.06, sx = 1 - bounce * 0.035;
  const tilt = swayOn ? Math.sin(now / 1600) * 1.2 * g : 0;
  hairG.attr("transform", `rotate(${tilt},0,60) translate(0,${m.bot}) scale(${sx},${sy}) translate(0,${-m.bot})`)
    .style("opacity", ramp(g, 0.1, 0.14));
  mass.attr("d", massPath(g, now, wob));
  const curlK = ramp(g, 0.32, 0.7);
  curlG.style("display", curlK > 0 ? null : "none").attr("stroke-opacity", 0.3 * curlK)
    .attr("stroke-width", 1.8 + 0.8 * g);
  if (curlK > 0) {
    curlSel.attr("d", c => {
      const x = m.rx * 0.9 * c.rr * Math.cos(c.a), y = m.cy + m.ry * 0.9 * c.rr * Math.sin(c.a);
      const r = (2.8 + 3.4 * g) * c.sz;
      return `M${(x - r).toFixed(1)},${y.toFixed(1)}a${r.toFixed(1)},${r.toFixed(1)} 0 1 1 ${r.toFixed(1)},${r.toFixed(1)}`;
    }).attr("transform", c => {
      const x = m.rx * 0.9 * c.rr * Math.cos(c.a), y = m.cy + m.ry * 0.9 * c.rr * Math.sin(c.a);
      return `rotate(${c.rot},${x.toFixed(1)},${y.toFixed(1)})`;
    });
  }
  capStub.style("opacity", ramp(g, 0.005, 0.06) * (1 - ramp(g, 0.14, 0.26)));
  capSolid.style("opacity", ramp(g, 0.1, 0.26));
  shineEl.style("opacity", 1 - ramp(g, 0.02, 0.12));
  // breathing
  sway.attr("transform", `translate(0,${swayOn ? Math.sin(now / 900) * 0.8 : 0})`);
  // the face: a bigger smile, raised brows and rosier cheeks as the hair grows
  const w = 8 + 10 * g, h = 1.5 + 9.5 * g, ym = 27;
  mouth.attr("d", `M${-w},${ym} Q0,${ym + 2 * h} ${w},${ym} Q0,${ym + 1.5 - 1.5 * g} ${-w},${ym}Z`);
  cheeks.attr("fill-opacity", 0.12 + 0.2 * g);
  brows.forEach((b, i) => {
    const sd = i ? 1 : -1, lift = 1 + 3.5 * g;
    b.attr("d", `M${sd * 25},${-11 - lift * 0.4} Q${sd * 17},${-16 - lift} ${sd * 9},${-12 - lift * 0.7}`);
  });
  const blink = now < blinkUntil ? 0.12 : 1;
  eyes.forEach(e => {
    const shut = (e.sd > 0 && now < winkUntil) ? 0.12 : blink;
    e.g.attr("transform", `translate(${e.sd * 17 + look[0]},${1 + look[1]}) scale(1,${shut})`);
  });
  // the pick shows up in a full afro
  const pk = ramp(g, 0.9, 0.99);
  const pa = -Math.PI / 2 + 0.75;
  pick.style("display", pk > 0 ? null : "none").attr("transform",
    `translate(${(m.rx * 0.8 * Math.cos(pa)).toFixed(1)},${(m.cy + m.ry * 0.8 * Math.sin(pa) + (1 - pk) * 18 - bounce * 6).toFixed(1)}) rotate(${24 + tilt}) scale(${1.35 * pk})`);
}

const loop = pkLoop(svg, now => {
  const dt = Math.min(50, now - lastNow) / 1000; lastNow = now;
  // a damped spring for the bounce of the afro
  bounceV += (-bounce * 140 - bounceV * 7) * dt;
  bounce = pkClamp(bounce + bounceV * dt, -1, 1);
  look[0] += (lookTo[0] - look[0]) * Math.min(1, dt * 10);
  look[1] += (lookTo[1] - look[1]) * Math.min(1, dt * 10);
  if (!pkCalm && now > nextBlink) { blinkUntil = now + 130; nextBlink = now + 2200 + Math.random() * 3500; }
  const g = lv.get(now);
  draw(g, now);
  if (pctText) pctText.text(pkPct(g));
  if (stageText) stageText.text(stageOf(g));
});
loop.onVisible(() => {
  if (startFrom !== level) {
    lv.set(startFrom, 0);
    lv.set(level, startFrom === 0 ? 2400 : 1100);
    if (!pkCalm) ddplotTrack(d3.timeout(() => { bounceV += 2.2; }, startFrom === 0 ? 2300 : 1000));
  }
});

function setLevel(v, instant) {
  const before = lv.target();
  lv.set(v, instant ? 150 : 700);
  st.level = v;
  if (!pkCalm && v > before) bounceV += instant ? 0.4 : 1.2;
  svg.attr("aria-label", ariaOf(v));
}

// ---- interactions -------------------------------------------------------------------
// the eyes follow the mouse
svg.on("mousemove.eyes", function (a) {
  const p = pkPtr(a, svg.node());
  const dx = (p[0] - X0) / s, dy = (p[1] - Y0) / s;
  const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 60) * 2.6;
  lookTo = [dx / len * k, dy / len * k * 0.8];
}).on("mouseleave.eyes", () => { lookTo = [0, 0]; });

const hit = scene.append("rect").attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH)
  .attr("fill", "transparent").style("cursor", "pointer");
hit.on("mouseenter", () => { if (!pkCalm) bounceV += 0.8; })
  .on("click", () => {
    const now = pkNow(), g = lv.get(now);
    if (!pkCalm) { bounceV += 3.2; winkUntil = now + 420; }
    if (g < 0.06) ding();
    send("clicked", { value: lv.target(), stage: stageOf(lv.target()) });
  });
if (o.draggable) {
  // drag up to grow the hair and down to cut it, relative to where the drag
  // starts (a plain click leaves the level alone); 150 units of drag = 0 to 1
  let anchor = null;
  pkLevelInput(svg, hit, {
    yToLevel: y => {
      if (anchor === null) anchor = { y, v: lv.target() };
      return anchor.v + (anchor.y - y) / (150 * s);
    },
    onLevel: setLevel,
    current: () => lv.target(),
    send: (suffix, value) => { anchor = null; send(suffix, value); }
  });
}

// a bald head shines when clicked
function ding() {
  if (pkCalm) return;
  [[-24, -50, 1], [-8, -58, 0.7], [-32, -36, 0.55]].forEach((p, k) => {
    sway.append("path").attr("d", "M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5Z")
      .attr("fill", "white").style("pointer-events", "none")
      .attr("transform", `translate(${p[0]},${p[1]}) scale(0)`)
      .transition().delay(k * 90).duration(260).attr("transform", `translate(${p[0]},${p[1]}) scale(${p[2]}) rotate(45)`)
      .transition().duration(380).attr("transform", `translate(${p[0]},${p[1]}) scale(0) rotate(90)`).remove();
  });
}
