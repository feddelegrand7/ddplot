const fillLevel     = Math.min(Math.max(data, 0), 1);
const label         = options.label         || (Math.round(fillLevel * 1000) / 10) + "%";
const fillColor     = options.fillColor     || "steelblue";
const circleColor   = options.circleColor   || fillColor;
const circleThickR  = options.circleThickness != null ? options.circleThickness : 0.05;
const textColor     = options.textColor     || fillColor;
const waveTextColor = options.waveTextColor || "white";
const textSizeR     = options.textSize      != null ? options.textSize : 0.38;
const waveAmplR     = options.waveAmplitude != null ? options.waveAmplitude : 0.09;
const waveCount     = options.waveCount     || 2;
const waveSpeed     = options.waveSpeed     || 1;
const title         = options.title         || null;
const titleSize     = options.titleFontSize || 14;
const fontFamily    = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol         = options.bgcol   || "white";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// --- Geometry ---
const titleH   = title ? titleSize + 10 : 0;
const cx       = width  / 2;
const cy       = (height - titleH) / 2;
const radius   = Math.min(width, height - titleH) / 2 * 0.82;
const circleThick = radius * circleThickR;
const innerR   = radius - circleThick;
const waveH    = innerR * waveAmplR;
const waveLength = (innerR * 2) / waveCount;     // px per wave cycle
const textSize = innerR * textSizeR;

// Target fill Y (SVG y=0 is top, so filled from bottom)
const targetFillY = cy + innerR - fillLevel * 2 * innerR;

// --- Unique IDs (safe for multiple charts on same page) ---
const uid         = Math.random().toString(36).slice(2, 8);
const circleClipId = "liq-circle-" + uid;
const waveClipId   = "liq-wave-"   + uid;

const defs = svg.append("defs");

// Circle clip path
defs.append("clipPath").attr("id", circleClipId)
  .append("circle")
  .attr("cx", cx).attr("cy", cy).attr("r", innerR - 1);

// Wave clip path (updated each frame) — defines the "inside water" region
const waveClipGroup = defs.append("clipPath").attr("id", waveClipId);
const waveClipPath  = waveClipGroup.append("path");

// --- Background tint (empty part of circle) ---
svg.append("circle")
  .attr("cx", cx).attr("cy", cy).attr("r", innerR - 1)
  .attr("fill", fillColor)
  .attr("opacity", 0.1);

// --- text1: above-water label (behind waves, normal textColor) ---
const text1 = svg.append("text")
  .attr("x", cx).attr("y", cy)
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "middle")
  .attr("font-size",   textSize)
  .attr("font-family", fontFamily)
  .attr("font-weight", "bold")
  .attr("fill", textColor)
  .text(label);

// --- Fill group (wave visuals, clipped to circle) ---
const fillGroup = svg.append("g").attr("clip-path", `url(#${circleClipId})`);
const wave1     = fillGroup.append("path").attr("fill", fillColor).attr("opacity", 0.9);
const wave2     = fillGroup.append("path").attr("fill", fillColor).attr("opacity", 0.45);

// --- Circle outline (drawn on top of fill so edge is crisp) ---
svg.append("circle")
  .attr("cx", cx).attr("cy", cy).attr("r", radius)
  .attr("fill",         "none")
  .attr("stroke",       circleColor)
  .attr("stroke-width", circleThick);

// --- text2: below-water label (clipped to wave area, waveTextColor) ---
svg.append("text")
  .attr("clip-path",         `url(#${waveClipId})`)
  .attr("x", cx).attr("y", cy)
  .attr("text-anchor",       "middle")
  .attr("dominant-baseline", "middle")
  .attr("font-size",         textSize)
  .attr("font-family",       fontFamily)
  .attr("font-weight",       "bold")
  .attr("fill",              waveTextColor)
  .text(label);

// --- Wave path generator ---
// Draws from x = cx-2*innerR to cx+2*innerR (wider than circle for seamless loop)
// fillY: current y of the still-water surface
// phase: horizontal phase offset in radians
function makePath(fillY, phase) {
  const xL  = cx - innerR * 2.2;
  const xR  = cx + innerR * 2.2;
  const bot = cy + innerR + 4;
  const step = (xR - xL) / 64;   // 64 segments — smooth but fast

  let d = `M ${xL.toFixed(1)},${bot}`;
  for (let x = xL; x <= xR; x += step) {
    const y = fillY + waveH * Math.sin(((x - cx) / waveLength) * 2 * Math.PI + phase);
    d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  d += ` L ${xR.toFixed(1)},${bot} Z`;
  return d;
}

// --- Animation ---
const riseDuration = 1400; // ms for water to rise to target level
let startTime = null;

d3.timer(elapsed => {
  if (startTime === null) startTime = elapsed;
  const dt = elapsed - startTime;

  // Water-rise easing (stops after riseDuration)
  const riseT    = Math.min(1, dt / riseDuration);
  const easedT   = 1 - Math.pow(1 - riseT, 3); // ease-out cubic
  const fillY    = cy + innerR - easedT * fillLevel * 2 * innerR;

  // Continuous horizontal wave motion (phase in radians)
  const phase    = (dt / 1000) * waveSpeed * 1.8;

  // Primary wave (phase offset 0)
  const p1 = makePath(fillY, phase);
  wave1.attr("d", p1);

  // Second wave (slightly offset phase and slower — gives depth)
  const p2 = makePath(fillY + waveH * 0.3, phase * 0.7 + Math.PI * 0.6);
  wave2.attr("d", p2);

  // Keep wave clip in sync with wave1 so text2 is revealed correctly
  waveClipPath.attr("d", p1);
});

// --- Title below the circle ---
if (title) {
  svg.append("text")
    .attr("x",            cx)
    .attr("y",            cy + innerR + circleThick + titleSize + 6)
    .attr("text-anchor",  "middle")
    .attr("font-size",    titleSize)
    .attr("font-family",  fontFamily)
    .attr("fill",         fillColor)
    .text(title);
}
