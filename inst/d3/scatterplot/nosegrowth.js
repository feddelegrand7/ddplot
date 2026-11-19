// nose_growth() -- a person in profile whose nose grows with a level, from a
// small nose (0) to a very long one (1), like a teller of tall tales. Leaves
// sprout from a long nose and a bird lands on the longest. The face gets more
// nervous as the nose grows; the ponytail swings, the eyes follow the mouse and
// a click makes the nose wobble and the person protest.
// Uses playkit.js (prepended by play_script()).

const o = options || {};
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = o.bgcol || "white";
const hairColor = o.hairColor || "#c0622f";
const skinColor = o.skinColor || "#f3c9a8";
const shirtColor = o.shirtColor || "#27365c";
const panelColor = o.panelColor || null;
const labelColor = o.labelColor || "#333333";
const titleColor = o.titleColor || "#333333";
const level = pkClamp(pkNum(o.level, 0), 0, 1);
const target = pkNum(o.target, null);
const send = pkShiny(svg);
const uid = pkUid("nose");
const tw = pkMeasure(svg, font);
const STAGES = [[0.05, "Honest"], [0.25, "Little fib"], [0.5, "White lie"], [0.75, "Tall tale"],
  [0.95, "Whopper"], [1.01, "Pants on fire"]];
const stageOf = g => (STAGES.find(s => g < s[0]) || STAGES[STAGES.length - 1])[1];
const QUOTES = [[0.05, "It's true!"], [0.3, "Honestly!"], [0.6, "I swear!"], [0.85, "Trust me!"], [1.01, "Would I lie?"]];
const quoteOf = g => (QUOTES.find(q => g < q[0]) || QUOTES[QUOTES.length - 1])[1];
const ariaOf = v => (o.titleText ? o.titleText + ": " : "") + pkPct(v) + " grown, " + stageOf(v);
const ramp = (v, a, b) => pkClamp((v - a) / (b - a), 0, 1);
const lerp = (a, b, k) => a + (b - a) * k;

svg.style("background-color", bgcol).style("font-family", font)
  .attr("role", "img").attr("aria-label", ariaOf(level));

// ---- layout ---------------------------------------------------------------------------
// Drawn in its own units (the head is about 115 units wide, facing right) inside
// a 380 x 320 card that leaves room for the nose, scaled to fit the chart.
const titleFs = pkPx(o.titleFontSize, 14);
const hasTitle = !!o.titleText;
const showLabel = o.renderFillLabel !== false;
const labelFs = pkPx(o.labelFontSize, Math.max(16, Math.min(34, H * 0.065)));
const topSpace = showLabel ? labelFs + 34 : 8;
const bottomSpace = hasTitle ? titleFs + 20 : 8;
const CX0 = -120, CY0 = -128, CW = 380, CH = 290;
const s = Math.max(0.1, Math.min((W - 16) / CW, (H - topSpace - bottomSpace - 6) / CH));
const X0 = W / 2 - (CX0 + CW / 2) * s;
const Y0 = topSpace + (H - topSpace - bottomSpace - CH * s) / 2 - CY0 * s;
const toScreen = (x, y) => [X0 + x * s, Y0 + y * s];

// the nose: from 9 units (a normal nose) to the right edge of the card
const NOSE_MIN = 9, NOSE_MAX = CX0 + CW - 16 - 52;
const noseLen = g => NOSE_MIN + (NOSE_MAX - NOSE_MIN) * g;
const tipOf = L => [52 + L, 1 - L * 0.035];
const tipR = L => lerp(5.6, 4.8, pkClamp((L - NOSE_MIN) / 20, 0, 1));
// a point on the top edge of the nose, a share u of the way to the tip
function noseTop(L, u) {
  const [tx, ty] = tipOf(L), r = tipR(L);
  return [lerp(50, tx, u), lerp(-7, ty - r, Math.pow(u, 0.7))];
}
function nosePath(L) {
  const [tx, ty] = tipOf(L), r = tipR(L);
  return `M50,-7 C${50 + L * 0.3},-6.5 ${tx - L * 0.3},${ty - r} ${tx},${ty - r}` +
    ` A${r},${r} 0 0 1 ${tx},${ty + r}` +
    ` C${tx - L * 0.3},${ty + r + 1} ${60 + L * 0.08},11 56,11 Q51,11 52,6 Z`;
}

// ---- colours & defs ---------------------------------------------------------------------
const skinDark = d3.color(skinColor).darker(0.3).toString();
const skinDeep = d3.color(skinColor).darker(0.9).toString();
const hairDark = d3.color(hairColor).darker(0.5).toString();
const hairLight = pkMix(hairColor, "#ffffff", 0.3);
const shirtBase = pkMix(shirtColor, "#ffffff", 0.92);
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "card").append("rect")
  .attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH).attr("rx", 22);
const bodyD = "M-100,190 C-100,128 -66,100 -16,94 L22,94 C70,100 96,128 96,190 Z";
defs.append("clipPath").attr("id", uid + "body").append("path").attr("d", bodyD);

// ---- drawing --------------------------------------------------------------------------
const scene = svg.append("g").attr("transform", `translate(${X0},${Y0}) scale(${s})`);
const card = scene.append("g").attr("clip-path", `url(#${uid}card)`);
if (panelColor) {
  card.append("rect").attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH).attr("fill", panelColor);
}
const person = card.append("g");

// the ponytail swings behind the head
const tail = person.append("g");
tail.append("path").attr("fill", hairColor)
  .attr("d", "M0,0 C-24,2 -40,22 -37,48 C-35,66 -21,74 -12,64 C-19,50 -13,26 7,8 Z");
tail.append("path").attr("fill", "none").attr("stroke", hairDark).attr("stroke-opacity", 0.35).attr("stroke-width", 1.4)
  .attr("stroke-linecap", "round").attr("d", "M-6,8 C-22,18 -28,36 -24,56 M-14,6 C-28,16 -33,34 -31,48");
tail.append("ellipse").attr("rx", 5).attr("ry", 7.5).attr("fill", "#e5484d").attr("transform", "rotate(-30)");

// body: a striped top and the neck
const body = person.append("g").attr("transform", "translate(0,-10)");
body.append("rect").attr("x", -17).attr("y", 30).attr("width", 32).attr("height", 70).attr("fill", skinDark);
body.append("path").attr("d", bodyD).attr("fill", shirtBase);
const stripes = body.append("g").attr("clip-path", `url(#${uid}body)`);
d3.range(104, 190, 13).forEach(y => stripes.append("rect").attr("x", -110).attr("y", y).attr("width", 220).attr("height", 5.5)
  .attr("fill", shirtColor));
body.append("path").attr("fill", "none").attr("stroke", shirtColor).attr("stroke-width", 3)
  .attr("d", "M-19,95 Q0,103 18,95");

// head (in profile, facing right)
const head = person.append("g");
head.append("path").attr("fill", skinColor).attr("d",
  "M-20,48 C-50,40 -60,10 -58,-15 C-55,-50 -25,-65 5,-63 C35,-62 50,-45 52,-25" +
  " C53,-15 50,-10 52,-5 L54,8 C52,12 55,15 55,18 C55,22 52,24 53,27 C55,32 54,40 46,44" +
  " C35,50 20,48 10,50 Z");
// ear
head.append("ellipse").attr("cx", -10).attr("cy", 2).attr("rx", 9).attr("ry", 12.5).attr("fill", skinDark);
head.append("path").attr("d", "M-8,-6 C-14,-4 -15,8 -8,10").attr("fill", "none").attr("stroke", skinDeep)
  .attr("stroke-opacity", 0.45).attr("stroke-width", 1.8).attr("stroke-linecap", "round");
// cheek and freckles
const blush = head.append("ellipse").attr("cx", 31).attr("cy", 7).attr("rx", 10).attr("ry", 6).attr("fill", "#ff7a6b");
[[24, 2], [28.5, 4.5], [33, 1.5], [27, 8], [35, 6]].forEach(p => head.append("circle").attr("cx", p[0]).attr("cy", p[1])
  .attr("r", 0.95).attr("fill", skinDeep).attr("fill-opacity", 0.5));
// hair (top and back of the head, with a fringe)
head.append("path").attr("fill", hairColor).attr("d",
  "M50,-28 C52,-52 30,-71 0,-70 C-35,-69 -63,-45 -62,-12 C-61,8 -55,26 -45,38 L-33,36" +
  " C-37,24 -34,10 -23,3 C-23,-10 -17,-19 -5,-22 C8,-25 16,-34 21,-40 C31,-33 42,-31 50,-28 Z");
head.append("path").attr("fill", "none").attr("stroke", hairLight).attr("stroke-opacity", 0.5).attr("stroke-width", 1.6)
  .attr("stroke-linecap", "round").attr("d", "M-30,-58 C-10,-64 16,-62 34,-50 M-48,-40 C-30,-52 -8,-55 12,-50");
// eye, brow and mouth
const eye = head.append("g");
eye.append("ellipse").attr("rx", 3.3).attr("ry", 4.6).attr("fill", "#2a1d18");
eye.append("circle").attr("cx", 1.1).attr("cy", -1.6).attr("r", 1.1).attr("fill", "white").attr("fill-opacity", 0.9);
head.append("path").attr("d", "M36,-17 l4,-3").attr("stroke", "#2a1d18").attr("stroke-width", 1.4).attr("stroke-linecap", "round");
const brow = head.append("path").attr("fill", "none").attr("stroke", hairDark).attr("stroke-width", 2.8).attr("stroke-linecap", "round");
const mouth = head.append("path").attr("fill", "none").attr("stroke", skinDeep).attr("stroke-width", 2.2).attr("stroke-linecap", "round");
const sweat = head.append("path").attr("d", "M0,-5 C2.4,-1.5 3.6,1 3.6,2.6 A3.6,3.6 0 0 1 -3.6,2.6 C-3.6,1 -2.4,-1.5 0,-5Z")
  .attr("fill", "#8fd0ff").attr("stroke", "#4aa3df").attr("stroke-width", 0.8);

// the nose, with its twig and its bird (they all wobble together)
const ghost = person.append("path").attr("fill", "none").attr("stroke", labelColor).attr("stroke-opacity", 0.55)
  .attr("stroke-width", 1.6 / s).attr("stroke-dasharray", `${6 / s},${4 / s}`).style("pointer-events", "none");
const noseG = person.append("g");
const twig = noseG.append("g");
twig.append("path").attr("d", "M0,0 L0,-15 M0,-8 L5,-13").attr("stroke", "#7a5230").attr("stroke-width", 2).attr("stroke-linecap", "round");
const leafD = "M0,0 C3,-4 9,-4 12,0 C9,3.5 3,3.5 0,0Z";
[[0, -15, -70], [0, -9, -160], [5, -13, -20]].forEach(l => twig.append("path").attr("d", leafD).attr("fill", "#3ca951")
  .attr("transform", `translate(${l[0]},${l[1]}) rotate(${l[2]})`));
const nose = noseG.append("path").attr("fill", skinColor);
const noseShine = noseG.append("path").attr("fill", "none").attr("stroke", "white").attr("stroke-opacity", 0.35)
  .attr("stroke-width", 1.4).attr("stroke-linecap", "round");
const tipBlush = noseG.append("circle").attr("fill", "#ff7a6b").attr("fill-opacity", 0.3);
noseG.append("path").attr("d", "M56,7.5 q2.8,1.5 5,-0.6").attr("fill", "none").attr("stroke", skinDeep)
  .attr("stroke-opacity", 0.6).attr("stroke-width", 1.3).attr("stroke-linecap", "round");
const bird = noseG.append("g");
const birdBody = bird.append("g");
birdBody.append("path").attr("d", "M-8,-7 L-17,-11 L-15,-4 Z").attr("fill", "#2f6db5");
birdBody.append("ellipse").attr("cx", -1).attr("cy", -8).attr("rx", 9.5).attr("ry", 7.5).attr("fill", "#4a90d9");
birdBody.append("ellipse").attr("cx", 1).attr("cy", -5.5).attr("rx", 6).attr("ry", 4.5).attr("fill", "#dcecff");
birdBody.append("circle").attr("cx", 6).attr("cy", -15).attr("r", 5.5).attr("fill", "#4a90d9");
birdBody.append("path").attr("d", "M10.5,-16 L15.5,-14.5 L10.5,-13 Z").attr("fill", "#efb118");
birdBody.append("circle").attr("cx", 7.6).attr("cy", -16).attr("r", 1.1).attr("fill", "#1c1c1c");
const wing = birdBody.append("ellipse").attr("cx", -3).attr("cy", -9).attr("rx", 6).attr("ry", 3.6).attr("fill", "#2f6db5");
bird.append("path").attr("d", "M-2,-1 L-3,1 M2,-1 L1,1").attr("stroke", "#efb118").attr("stroke-width", 1.2);

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
  const L = noseLen(target);
  ghost.attr("d", nosePath(L));
  const [tx, ty] = tipOf(L);
  const [sx, sy] = toScreen(Math.min(tx, CX0 + CW - 30), ty - 14);
  const tg = svg.append("g").attr("transform", `translate(${sx},${sy})`).style("pointer-events", "none");
  tg.append("text").attr("text-anchor", "middle").attr("dy", "-1.3em").style("font-size", "11px")
    .style("fill", labelColor).style("fill-opacity", 0.75).text("Target");
  tg.append("text").attr("text-anchor", "middle").style("font-size", "12px").style("font-weight", 700)
    .style("fill", labelColor).text(pkPct(target));
} else ghost.remove();

// ---- state & animation --------------------------------------------------------------
const st = pkState("nose");
const startFrom = (st.level !== undefined) ? st.level : (o.animate === false ? level : 0);
const lv = pkTween(startFrom);
st.level = level;
const swayOn = o.sway !== false && !pkCalm;
const showLeaves = o.leaves !== false, showBird = o.bird !== false;
let lastNow = pkNow();
let wob = 0, wobV = 0;           // the nose wobbles like a spring (degrees)
let swing = 0, swingV = 0;       // the ponytail
let hop = 0;                     // the bird hops when startled (0..1)
let look = [0, 0], lookTo = [0, 0];
let nextBlink = lastNow + 1800 + Math.random() * 2500, blinkUntil = 0;

function draw(g, now) {
  const L = noseLen(g);
  const bob = swayOn ? Math.sin(now / 900) * 0.8 : 0;
  person.attr("transform", `translate(0,${bob})`);
  // the nose
  nose.attr("d", nosePath(L));
  const [tx, ty] = tipOf(L), r = tipR(L);
  const p1 = noseTop(L, 0.15), p2 = noseTop(L, 0.8);
  noseShine.attr("d", L > 20 ? `M${p1[0]},${p1[1] + 1.8} L${p2[0]},${p2[1] + 1.8}` : null);
  tipBlush.attr("cx", tx).attr("cy", ty).attr("r", r * 0.85).attr("fill-opacity", 0.12 + 0.3 * g);
  noseG.attr("transform", `rotate(${wob + (swayOn ? Math.sin(now / 1300) * 0.6 * g : 0)},53,2)`);
  const leafK = showLeaves ? ramp(g, 0.62, 0.78) : 0;
  const tp = noseTop(L, 0.6);
  twig.style("display", leafK > 0 ? null : "none")
    .attr("transform", `translate(${tp[0]},${tp[1] + 1}) rotate(${-8 + (swayOn ? Math.sin(now / 700) * 4 : 0)}) scale(${1.3 * leafK})`);
  const birdK = showBird ? ramp(g, 0.92, 0.99) : 0;
  const bp = noseTop(L, 0.84);
  const fly = (1 - birdK) * 60 + Math.sin(hop * Math.PI) * 26;
  bird.style("display", birdK > 0 ? null : "none")
    .attr("transform", `translate(${bp[0]},${bp[1] + 0.5 - fly}) rotate(${-4 + (swayOn ? Math.sin(now / 500) * 3 : 0)}) scale(1.3)`)
    .style("opacity", birdK);
  wing.attr("ry", (fly > 1 ? 1 + 3 * Math.abs(Math.sin(now / 40)) : 3.6));
  // the face: from relaxed to nervous as the nose grows
  const smile = lerp(3.2, -1.2, ramp(g, 0, 0.7)), wave = ramp(g, 0.55, 0.85);
  mouth.attr("d", `M43,27 Q45.5,${27 + smile * (1 - wave) - 1.8 * wave} 48,${27 + smile * 0.4 * (1 - wave)} T53,26.4`);
  const lift = 3 * ramp(g, 0.3, 0.9);
  brow.attr("d", `M26,${-23 + lift * 0.3} Q33,${-27 - lift * 0.6} 41,${-24 - lift * 1.4}`);
  blush.attr("fill-opacity", 0.1 + 0.3 * g);
  const sw = ramp(g, 0.6, 0.75);
  const sp = swayOn ? (now / 2200) % 1 : 0.3;
  sweat.style("display", sw > 0 ? null : "none")
    .attr("transform", `translate(${14},${-38 + sp * 16}) scale(${sw})`).style("opacity", sw * (1 - Math.pow(sp, 3)));
  const blink = now < blinkUntil ? 0.12 : 1;
  eye.attr("transform", `translate(${35 + look[0]},${-13 + look[1]}) scale(1,${blink})`);
  tail.attr("transform", `translate(-52,-36) rotate(${swing + (swayOn ? Math.sin(now / 1100) * 3 : 0)})`);
}

const loop = pkLoop(svg, now => {
  const dt = Math.min(50, now - lastNow) / 1000; lastNow = now;
  wobV += (-wob * 160 - wobV * 6) * dt;
  wob = pkClamp(wob + wobV * dt, -25, 25);
  swingV += (-swing * 40 - swingV * 3) * dt;
  swing = pkClamp(swing + swingV * dt, -40, 40);
  if (hop > 0) hop = Math.max(0, hop - dt * 1.4);
  look[0] += (lookTo[0] - look[0]) * Math.min(1, dt * 10);
  look[1] += (lookTo[1] - look[1]) * Math.min(1, dt * 10);
  if (!pkCalm && now > nextBlink) { blinkUntil = now + 130; nextBlink = now + 2200 + Math.random() * 3500; }
  // the springy ease overshoots a little: draw the overshoot, but not in the labels
  const g = pkClamp(lv.get(now), 0, 1.08), gl = Math.min(1, g);
  draw(g, now);
  if (pctText) pctText.text(pkPct(gl));
  if (stageText) stageText.text(stageOf(gl));
});
loop.onVisible(() => {
  if (startFrom !== level) {
    lv.set(startFrom, 0);
    lv.set(level, startFrom === 0 ? 2400 : 1100, d3.easeBackOut);
    if (!pkCalm) ddplotTrack(d3.timeout(() => { wobV += 60; swingV += 40; }, startFrom === 0 ? 2300 : 1000));
  }
});

function setLevel(v, instant) {
  const before = lv.target();
  lv.set(v, instant ? 150 : 700, instant ? d3.easeCubicOut : d3.easeBackOut);
  st.level = v;
  if (!pkCalm && !instant && v !== before) wobV += (v > before ? 1 : -1) * 40;
  svg.attr("aria-label", ariaOf(v));
}

// ---- interactions -------------------------------------------------------------------
// the eye follows the mouse
svg.on("mousemove.eyes", function (a) {
  const p = pkPtr(a, svg.node());
  const dx = (p[0] - toScreen(35, -13)[0]) / s, dy = (p[1] - toScreen(35, -13)[1]) / s;
  const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 50) * 1.8;
  lookTo = [dx / len * k, dy / len * k];
}).on("mouseleave.eyes", () => { lookTo = [0, 0]; });

// a speech bubble: the person protests their innocence
let bubble = null;
function protest(text) {
  if (bubble) bubble.remove();
  const fs = Math.max(11, Math.min(15, 13 * s));
  const w = tw(text, fs, 700) + 20, h = fs + 14;
  const [bx, by] = toScreen(-20, -118);
  bubble = svg.append("g").style("pointer-events", "none").attr("transform", `translate(${bx},${by})`).style("opacity", 0);
  const [mx, my] = toScreen(28, -66);
  bubble.append("path").attr("fill", "white").attr("stroke", labelColor).attr("stroke-opacity", 0.25)
    .attr("d", `M${-w / 2 + 10},0 h${w - 20} a10,10 0 0 1 10,10 v${h - 20} a10,10 0 0 1 -10,10` +
      ` H${Math.min(w / 2 - 12, 18)} L${mx - bx},${my - by} L${Math.min(w / 2 - 12, 18) - 12},${h}` +
      ` H${-w / 2 + 10} a10,10 0 0 1 -10,-10 v${-(h - 20)} a10,10 0 0 1 10,-10Z`);
  bubble.append("text").attr("x", 0).attr("y", h / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
    .style("font-size", fs + "px").style("font-weight", 700).style("fill", labelColor).text(text);
  const b = bubble;
  b.transition().duration(180).style("opacity", 1).transition().delay(1300).duration(300).style("opacity", 0).remove();
}

const hit = scene.append("rect").attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH)
  .attr("fill", "transparent").style("cursor", o.draggable ? "ew-resize" : "pointer");
hit.on("mouseenter", () => { if (!pkCalm) { wobV += 18; swingV += 10; } })
  .on("click", () => {
    const g = lv.target();
    if (!pkCalm) { wobV += 110; swingV += 60; hop = 1; blinkUntil = pkNow() + 160; }
    protest(quoteOf(g));
    send("clicked", { value: g, stage: stageOf(g) });
  });

if (o.draggable) {
  // drag right to grow the nose and left to shrink it: the tip follows the mouse
  let anchor = null, moved = false;
  hit.call(d3.drag()
    .on("start", function (a) { const p = pkPtr(a, svg.node()); anchor = { x: p[0], v: lv.target() }; moved = false; })
    .on("drag", function (a) {
      const p = pkPtr(a, svg.node());
      const v = Math.round(pkClamp(anchor.v + (p[0] - anchor.x) / ((NOSE_MAX - NOSE_MIN) * s), 0, 1) * 100) / 100;
      if (v !== lv.target()) { moved = true; setLevel(v, true); }
    })
    .on("end", function () { if (moved) send("value", lv.target()); anchor = null; }));
  svg.attr("tabindex", 0).style("outline", "none").on("keydown", function (a) {
    const ev = pkEvOf(a);
    const step = ev.shiftKey ? 0.1 : 0.01;
    let d = 0;
    if (ev.key === "ArrowUp" || ev.key === "ArrowRight") d = step;
    else if (ev.key === "ArrowDown" || ev.key === "ArrowLeft") d = -step;
    else return;
    ev.preventDefault();
    const v = Math.round(pkClamp(lv.target() + d, 0, 1) * 100) / 100;
    setLevel(v, false);
    send("value", v);
  });
}
