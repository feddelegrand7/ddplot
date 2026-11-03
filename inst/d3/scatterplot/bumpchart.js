const ranked        = options.ranked === true;
const rankOrder     = options.rankOrder     || "desc";
const greyCol       = options.greyCol       || "#d3d3d3";
const lineWidth     = options.lineWidth     || 3;
const maxRadius     = options.circleRadius  || 11;
const showRank      = options.showRank !== false;
const title         = options.title         || null;
const titleSize     = options.titleFontSize || 16;
const xFontSize     = options.xFontSize     || 11;
const labelFontSize = options.labelFontSize || 11;
const fontFamily    = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol         = options.bgcol   || "white";
const axisCol       = options.axisCol || "black";

// Options that may arrive as a scalar, an array, or (colors) a named object
const toArray = v => (v === null || v === undefined) ? [] : [].concat(v);
const rawColors    = options.colors;
const colorMap     = (rawColors && !Array.isArray(rawColors) && typeof rawColors === "object") ? rawColors : null;
const colorList    = colorMap ? [] : toArray(rawColors).map(String);
const highlightSet = toArray(options.highlight).map(String);

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// Parse rows
const rows = (data || [])
  .map(d => ({ x: String(d.x), y: +d.y, group: String(d.group) }))
  .filter(d => d.x !== "null" && d.group !== "null" && isFinite(d.y));

if (!rows.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for bump_chart()");
  return;
}

// Periods (order supplied by R, falling back to order of appearance)
let periods = toArray(options.periods).map(String);
rows.forEach(d => { if (periods.indexOf(d.x) === -1) periods.push(d.x); });
const present = {};
rows.forEach(d => { present[d.x] = true; });
periods = periods.filter(p => present[p]);

// Groups in order of appearance
const groups = [];
rows.forEach(d => { if (groups.indexOf(d.group) === -1) groups.push(d.group); });

// Ranks per period (ties broken by order of appearance)
rows.forEach((d, i) => { d.order = i; });
periods.forEach(p => {
  const inPeriod = rows.filter(d => d.x === p);
  if (ranked) {
    inPeriod.forEach(d => { d.rank = d.y; });
  } else {
    inPeriod.sort((a, b) => {
      const diff = rankOrder === "asc" ? a.y - b.y : b.y - a.y;
      return diff !== 0 ? diff : a.order - b.order;
    });
    inPeriod.forEach((d, i) => { d.rank = i + 1; });
  }
});

// Colors
const palette = colorList.length ? colorList
  : (d3.schemeTableau10 || d3.schemeCategory10);
const hasHighlight = highlightSet.length > 0;
const groupInfo = groups.map((g, i) => {
  const base = (colorMap && colorMap[g]) ? String(colorMap[g]) : palette[i % palette.length];
  const isHL = !hasHighlight || highlightSet.indexOf(g) !== -1;
  const points = periods.map(p => {
    const r = rows.find(d => d.x === p && d.group === g);
    return r ? { period: p, rank: r.rank, value: r.y } : null;
  });
  const defined = points.filter(pt => pt !== null);
  return {
    key: g,
    baseColor: base,
    color: isHL ? base : greyCol,
    highlighted: isHL,
    points: points,
    first: defined[0],
    last: defined[defined.length - 1]
  };
});

// Draw greyed groups first so highlighted groups sit on top
groupInfo.sort((a, b) => (a.highlighted === b.highlighted) ? 0 : (a.highlighted ? 1 : -1));

// Layout
const allRanks = rows.map(d => d.rank);
const minRank  = Math.min(1, d3.min(allRanks));
const maxRank  = Math.max(minRank + 1, d3.max(allRanks));

const maxLabelLen = d3.max(groups, g => g.length) || 1;
const labelW = Math.min(maxLabelLen * labelFontSize * 0.62, width * 0.22);
const titleOffset = title ? titleSize + 16 : 0;

const margin = {
  top:    titleOffset + maxRadius + 10,
  right:  labelW + maxRadius + 14,
  bottom: xFontSize + maxRadius + 18,
  left:   labelW + maxRadius + 14
};

const chartW = Math.max(width  - margin.left - margin.right, 10);
const chartH = Math.max(height - margin.top  - margin.bottom, 10);

const xScale = d3.scalePoint()
  .domain(periods)
  .range([0, chartW])
  .padding(periods.length === 1 ? 0.5 : 0);

const yScale = d3.scaleLinear()
  .domain([minRank, maxRank])
  .range([0, chartH]);

// Shrink circles when space is tight
const rowGap = chartH / Math.max(maxRank - minRank, 1);
const colGap = periods.length > 1 ? chartW / (periods.length - 1) : chartW;
const radius = Math.max(2, Math.min(maxRadius, rowGap * 0.45, colGap * 0.3));
const rankFontSize = Math.max(radius * 0.95, 6);
const drawRankText = showRank && radius >= 6;

// Bump curve: native d3.curveBumpX (d3 >= 7) or an equivalent fallback
function BumpX(context) { this._context = context; }
BumpX.prototype = {
  areaStart: function() { this._line = 0; },
  areaEnd:   function() { this._line = NaN; },
  lineStart: function() { this._point = 0; },
  lineEnd:   function() {
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x; y = +y;
    if (this._point === 0) {
      this._point = 1;
      if (this._line) this._context.lineTo(x, y); else this._context.moveTo(x, y);
    } else {
      this._point = 2;
      this._x0 = (this._x0 + x) / 2;
      this._context.bezierCurveTo(this._x0, this._y0, this._x0, y, x, y);
    }
    this._x0 = x; this._y0 = y;
  }
};
const bumpCurve = d3.curveBumpX || function(context) { return new BumpX(context); };

const line = d3.line()
  .defined(d => d !== null)
  .x(d => xScale(d.period))
  .y(d => yScale(d.rank))
  .curve(bumpCurve);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Vertical guide per period
g.selectAll(".bump-grid")
  .data(periods)
  .join("line")
  .attr("class", "bump-grid")
  .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
  .attr("y1", yScale(minRank) - radius).attr("y2", yScale(maxRank) + radius)
  .attr("stroke", axisCol)
  .attr("stroke-opacity", 0.12)
  .attr("stroke-width", 1);

// Period labels
g.selectAll(".bump-period")
  .data(periods)
  .join("text")
  .attr("class", "bump-period")
  .attr("x", d => xScale(d))
  .attr("y", chartH + radius + xFontSize + 8)
  .attr("text-anchor", "middle")
  .attr("font-size", xFontSize)
  .attr("font-family", fontFamily)
  .attr("fill", axisCol)
  .text(d => d);

// One <g> per group
const series = g.selectAll(".bump-series")
  .data(groupInfo)
  .join("g")
  .attr("class", "bump-series")
  .style("cursor", "pointer");

series.append("path")
  .attr("class", "bump-line")
  .attr("d", d => line(d.points))
  .attr("fill", "none")
  .attr("stroke", d => d.color)
  .attr("stroke-width", lineWidth)
  .attr("stroke-linecap", "round");

// Wide invisible path to make hovering easier
series.append("path")
  .attr("class", "bump-hit")
  .attr("d", d => line(d.points))
  .attr("fill", "none")
  .attr("stroke", "transparent")
  .attr("stroke-width", Math.max(lineWidth * 4, 12));

const pointSel = series.selectAll(".bump-point")
  .data(d => d.points.filter(p => p !== null).map(p => ({ s: d, p: p })))
  .join("g")
  .attr("class", "bump-point")
  .attr("transform", d => `translate(${xScale(d.p.period)},${yScale(d.p.rank)})`);

pointSel.append("circle")
  .attr("r", radius)
  .attr("fill", d => d.s.color)
  .attr("stroke", bgcol)
  .attr("stroke-width", 1.5);

pointSel.append("title")
  .text(d => `${d.s.key} | ${d.p.period}: rank ${d.p.rank}` +
    (ranked ? "" : ` (${d.p.value})`));

if (drawRankText) {
  pointSel.append("text")
    .attr("class", "bump-rank")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("font-size", rankFontSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill", d => d.s.highlighted ? "white" : "#555555")
    .style("pointer-events", "none")
    .text(d => d.p.rank);
}

// Group labels at both ends
series.append("text")
  .attr("class", "bump-label-start")
  .attr("x", d => xScale(d.first.period) - radius - 6)
  .attr("y", d => yScale(d.first.rank))
  .attr("dy", "0.35em")
  .attr("text-anchor", "end")
  .attr("font-size", labelFontSize)
  .attr("font-family", fontFamily)
  .attr("fill", d => d.highlighted ? d.color : "#999999")
  .text(d => d.key);

series.append("text")
  .attr("class", "bump-label-end")
  .attr("x", d => xScale(d.last.period) + radius + 6)
  .attr("y", d => yScale(d.last.rank))
  .attr("dy", "0.35em")
  .attr("text-anchor", "start")
  .attr("font-size", labelFontSize)
  .attr("font-family", fontFamily)
  .attr("fill", d => d.highlighted ? d.color : "#999999")
  .text(d => d.key);

// Hover: emphasise one line, fade the others
series
  .on("mouseenter", function() {
    const self = this;
    series.transition().duration(150)
      .style("opacity", function() { return this === self ? 1 : 0.15; });
    const sel = d3.select(self).raise();
    sel.select(".bump-line")
      .attr("stroke", d => d.baseColor)
      .attr("stroke-width", lineWidth * 1.6);
    sel.selectAll("circle").attr("fill", d => d.s.baseColor);
    sel.selectAll(".bump-rank").attr("fill", "white");
    sel.selectAll(".bump-label-start, .bump-label-end")
      .attr("fill", d => d.baseColor)
      .attr("font-weight", "bold");
  })
  .on("mouseleave", function() {
    series.transition().duration(150).style("opacity", 1);
    series.order();
    const sel = d3.select(this);
    sel.select(".bump-line")
      .attr("stroke", d => d.color)
      .attr("stroke-width", lineWidth);
    sel.selectAll("circle").attr("fill", d => d.s.color);
    sel.selectAll(".bump-rank").attr("fill", d => d.s.highlighted ? "white" : "#555555");
    sel.selectAll(".bump-label-start, .bump-label-end")
      .attr("fill", d => d.highlighted ? d.color : "#999999")
      .attr("font-weight", null);
  });

// Chart title
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", titleSize + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill", axisCol)
    .text(title);
}
