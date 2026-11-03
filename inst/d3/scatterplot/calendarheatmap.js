// Calendar heatmap (GitHub / Frappe Charts style).
// One panel per year: week columns x weekday rows of rounded day squares,
// month labels on top, weekday labels on the left, "Less ... More" legend.

const weekStart     = options.weekStart === "monday" ? "monday" : "sunday";
const colorsRaw     = options.colors;
const colors        = colorsRaw == null
  ? ["#c0ddf9", "#73b3f3", "#3886e1", "#17459e"]
  : (Array.isArray(colorsRaw) ? colorsRaw : [colorsRaw]);
const emptyCol      = options.emptyCol || "#ebedf0";
const cellRadius    = options.cellRadius == null ? 2 : +options.cellRadius;
const cellGapOpt    = options.cellGap == null ? 3 : +options.cellGap;
const valueLabel    = options.valueLabel == null ? "" : String(options.valueLabel);
const valueFmtSpec  = options.valueFormat || ",.2~f";
const dateFmtSpec   = options.dateFormat  || "%a %b %-d, %Y";
const showYear      = options.showYearLabel     === undefined ? true : options.showYearLabel;
const showMonths    = options.showMonthLabels   === undefined ? true : options.showMonthLabels;
const showWeekdays  = options.showWeekdayLabels === undefined ? true : options.showWeekdayLabels;
const labelSize     = options.labelFontSize || 10;
const legendOn      = options.legend === undefined ? true : options.legend;
const legendLabsRaw = options.legendLabels;
const legendLabels  = Array.isArray(legendLabsRaw) && legendLabsRaw.length === 2
  ? legendLabsRaw : ["Less", "More"];
const hover         = options.hover   === undefined ? true : options.hover;
const animate       = options.animate === undefined ? true : options.animate;
const title         = options.title || null;
const titleSize     = options.titleFontSize || 16;
const fontFamily    = options.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol         = options.bgcol   || "white";
const axisCol       = options.axisCol || "#555555";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// ---- Formatters ------------------------------------------------------------
let fmtValue;
try { fmtValue = d3.format(valueFmtSpec); } catch (e) { fmtValue = d3.format(",.2~f"); }
const fmtDate  = d3.utcFormat(dateFmtSpec);
const fmtKey   = d3.utcFormat("%Y-%m-%d");
const parseKey = d3.utcParse("%Y-%m-%d");

// ---- Data ------------------------------------------------------------------
const byDate = new Map();
(data || []).forEach(d => {
  const dt = parseKey(String(d.date));
  const v  = +d.value;
  if (dt && isFinite(v)) byDate.set(fmtKey(dt), v);
});

if (!byDate.size) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for calendar_heatmap()");
  return;
}

const keys     = Array.from(byDate.keys()).sort();
const firstDay = parseKey(keys[0]);
const lastDay  = parseKey(keys[keys.length - 1]);
const years    = d3.range(firstDay.getUTCFullYear(), lastDay.getUTCFullYear() + 1);

const weekInterval = weekStart === "monday" ? d3.utcMonday : d3.utcSunday;
const rowOf  = dt => weekStart === "monday" ? (dt.getUTCDay() + 6) % 7 : dt.getUTCDay();
const colOf  = dt => weekInterval.count(d3.utcYear(dt), dt);

// ---- Color buckets ---------------------------------------------------------
// Days without data -> emptyCol. When every value is non-negative, zero is
// treated as "nothing happened" and drawn in emptyCol as well (GitHub style);
// positive values are split into length(colors) equal-width buckets.
const allValues = Array.from(byDate.values());
const vMin      = d3.min(allValues);
const vMax      = d3.max(allValues);
const nonNeg    = vMin >= 0;
const quant     = d3.scaleQuantize()
  .domain(nonNeg ? [0, vMax || 1] : [vMin, vMax === vMin ? vMin + 1 : vMax])
  .range(d3.range(colors.length));

function bucketOf(v) {
  if (v == null) return -1;
  if (nonNeg && v <= 0) return -1;
  return quant(v);
}
const fillOf = b => b < 0 ? emptyCol : colors[b];

// ---- Layout ----------------------------------------------------------------
const nCols = d3.max(years, y => colOf(new Date(Date.UTC(y, 11, 31))) + 1);

const pad          = 10;
const titleH       = title ? titleSize + 18 : 0;
const yearH        = showYear   ? labelSize + 12 : 0;
const monthH       = showMonths ? labelSize + 6  : 0;
const weekdayW     = showWeekdays ? Math.round(labelSize * 2.6) + 6 : 0;
const panelGap     = years.length > 1 ? 18 : 0;
const legendH      = legendOn ? labelSize + 22 : 0;

function cellFor(gap) {
  const fromW = (width - 2 * pad - weekdayW - (nCols - 1) * gap) / nCols;
  const availH = height - 2 * pad - titleH - legendH - (years.length - 1) * panelGap;
  const fromH = (availH / years.length - yearH - monthH - 6 * gap) / 7;
  return Math.min(fromW, fromH, 26);
}
let gap  = cellGapOpt;
let cell = cellFor(gap);
if (cell < 8 && gap > 1) {          // small widgets: tighten the gaps
  gap  = Math.max(1, Math.min(gap, cell * 0.2));
  cell = cellFor(gap);
}
cell = Math.max(2, cell);
const step   = cell + gap;
const rx     = Math.min(cellRadius, cell / 2);

const gridW  = nCols * step - gap;
const gridH  = 7 * step - gap;
const panelH = yearH + monthH + gridH;
const totalW = weekdayW + gridW;
const totalH = titleH + years.length * panelH + (years.length - 1) * panelGap + legendH;

const offX = Math.max(pad, (width  - totalW) / 2);
const offY = Math.max(pad, (height - totalH) / 2);

// ---- Title -----------------------------------------------------------------
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", offY + titleSize)
    .attr("text-anchor", "middle")
    .attr("font-size",   titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill",        axisCol)
    .text(title);
}

const root = svg.append("g")
  .attr("transform", `translate(${offX},${offY + titleH})`);

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayNames = weekStart === "monday"
  ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekdayRows = weekStart === "monday" ? [0, 2, 4] : [1, 3, 5];

// ---- Panels ----------------------------------------------------------------
const allDays = [];

years.forEach((yr, yi) => {
  const panel = root.append("g")
    .attr("class", "cal-year")
    .attr("transform", `translate(0,${yi * (panelH + panelGap)})`);

  const days = d3.utcDays(new Date(Date.UTC(yr, 0, 1)), new Date(Date.UTC(yr + 1, 0, 1)))
    .map(dt => {
      const key = fmtKey(dt);
      const v   = byDate.has(key) ? byDate.get(key) : null;
      return { date: dt, key: key, value: v, bucket: bucketOf(v),
               col: colOf(dt), row: rowOf(dt), yi: yi };
    });
  allDays.push.apply(allDays, days);

  // Year header: "2024" + total
  if (showYear) {
    const withData = days.filter(d => d.value != null);
    const total    = d3.sum(withData, d => d.value);
    const header = panel.append("text")
      .attr("x", weekdayW)
      .attr("y", labelSize + 1)
      .attr("font-family", fontFamily)
      .attr("font-size",   labelSize + 1)
      .attr("fill",        axisCol);
    header.append("tspan").attr("font-weight", "bold").text(yr);
    header.append("tspan")
      .attr("fill-opacity", 0.75)
      .text(withData.length
        ? "  ·  " + fmtValue(total) + (valueLabel ? " " + valueLabel : "") + " in total"
        : "  ·  no data");
  }

  const grid = panel.append("g")
    .attr("transform", `translate(${weekdayW},${yearH + monthH})`);

  // Month labels: placed over the first full week of each month
  if (showMonths) {
    const estW = labelSize * 2.1;
    let lastEnd = -Infinity;
    d3.range(12).forEach(m => {
      const d1  = new Date(Date.UTC(yr, m, 1));
      const col = rowOf(d1) === 0 ? colOf(d1) : colOf(d1) + 1;
      const x   = col * step;
      if (x < lastEnd + 2 || x + estW > gridW + estW * 0.6) return;
      lastEnd = x + estW;
      grid.append("text")
        .attr("x", x)
        .attr("y", -6)
        .attr("font-family", fontFamily)
        .attr("font-size",   labelSize)
        .attr("fill",        axisCol)
        .text(monthNames[m]);
    });
  }

  // Weekday labels
  if (showWeekdays) {
    weekdayRows.forEach(r => {
      grid.append("text")
        .attr("x", -6)
        .attr("y", r * step + cell / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("font-family", fontFamily)
        .attr("font-size",   labelSize)
        .attr("fill",        axisCol)
        .text(weekdayNames[r]);
    });
  }

  grid.append("g")
    .attr("class", "cal-days")
    .selectAll("rect")
    .data(days)
    .join("rect")
    .attr("class", "cal-day")
    .attr("x", d => d.col * step)
    .attr("y", d => d.row * step)
    .attr("width",  cell)
    .attr("height", cell)
    .attr("rx", rx).attr("ry", rx)
    .attr("fill", d => fillOf(d.bucket))
    .attr("stroke", "none");
});

const cells = root.selectAll("rect.cal-day");

// ---- Entrance animation: staggered fade-in, left to right ------------------
if (animate) {
  cells
    .style("opacity", 0)
    .transition()
    .duration(450)
    .delay(d => d.yi * 140 + d.col * 13 + d.row * 9)
    .ease(d3.easeCubicOut)
    .style("opacity", 1);
}

// ---- Legend ----------------------------------------------------------------
let legendCells = null;
if (legendOn) {
  const lc     = Math.max(8, Math.min(cell, 14));
  const lStep  = lc + Math.max(2, Math.min(gap, 4));
  const buckets = [-1].concat(d3.range(colors.length));
  const ly = years.length * panelH + (years.length - 1) * panelGap + 12;

  const lg = root.append("g").attr("class", "cal-legend");

  const lessTxt = lg.append("text")
    .attr("y", lc / 2).attr("dy", "0.35em")
    .attr("font-family", fontFamily).attr("font-size", labelSize)
    .attr("fill", axisCol).attr("text-anchor", "end")
    .text(legendLabels[0]);
  legendCells = lg.selectAll("rect")
    .data(buckets)
    .join("rect")
    .attr("x", (b, i) => i * lStep)
    .attr("width", lc).attr("height", lc)
    .attr("rx", Math.min(cellRadius, lc / 2)).attr("ry", Math.min(cellRadius, lc / 2))
    .attr("fill", fillOf);
  const moreTxt = lg.append("text")
    .attr("x", buckets.length * lStep + 2)
    .attr("y", lc / 2).attr("dy", "0.35em")
    .attr("font-family", fontFamily).attr("font-size", labelSize)
    .attr("fill", axisCol)
    .text(legendLabels[1]);
  lessTxt.attr("x", -6);

  // Right-align with the grid
  const moreW = moreTxt.node().getComputedTextLength ? moreTxt.node().getComputedTextLength() : 30;
  const legW  = buckets.length * lStep + 2 + moreW;
  lg.attr("transform", `translate(${weekdayW + gridW - legW},${ly})`);
}

// ---- Tooltip (SVG-embedded, dark Frappe-like bubble with an arrow) ---------
// Kept inside the SVG rather than as a <div> on <body> so it renders the same
// in the RStudio viewer, R Markdown and pkgdown (r2d3 uses a shadow root).
const tipBg = "#36414c";
const tip = svg.append("g")
  .attr("class", "cal-tooltip")
  .style("pointer-events", "none")
  .style("opacity", 0);
const tipRect  = tip.append("rect").attr("rx", 4).attr("ry", 4).attr("fill", tipBg);
const tipArrow = tip.append("path").attr("fill", tipBg);
const tipText  = tip.append("text")
  .attr("font-family", fontFamily)
  .attr("text-anchor", "middle");
const tipLine1 = tipText.append("tspan").attr("x", 0)
  .attr("font-size", 12).attr("font-weight", "bold").attr("fill", "#ffffff");
const tipLine2 = tipText.append("tspan").attr("x", 0).attr("dy", 16)
  .attr("font-size", 11).attr("fill", "#c8d0d8");

function showTip(d) {
  tipLine1.text(d.value == null
    ? "No " + (valueLabel || "data")
    : fmtValue(d.value) + (valueLabel ? " " + valueLabel : ""));
  tipLine2.text(fmtDate(d.date));

  const bb   = tipText.node().getBBox();
  const px   = 8, py = 6, arrow = 6;
  const boxW = bb.width + 2 * px;
  const boxH = bb.height + 2 * py;

  // Cell centre in SVG coordinates
  const cx = offX + weekdayW + d.col * step + cell / 2;
  const cyTop = offY + titleH + d.yi * (panelH + panelGap) + yearH + monthH + d.row * step;

  let below = cyTop - boxH - arrow - 2 < 0;
  let bx = cx - boxW / 2;
  bx = Math.max(2, Math.min(bx, width - boxW - 2));
  const by = below ? cyTop + cell + arrow + 2 : cyTop - boxH - arrow - 2;

  // Text is centred at x = 0 inside the group; place the rect around it.
  const textTop = bb.y;
  tipRect.attr("x", -boxW / 2).attr("y", textTop - py)
    .attr("width", boxW).attr("height", boxH);

  const gx = bx + boxW / 2;
  const gy = by - (textTop - py);
  const ax = cx - gx;  // arrow x relative to group
  const aBase = below ? textTop - py : textTop - py + boxH;
  const aTip  = below ? aBase - arrow : aBase + arrow;
  tipArrow.attr("d", `M${ax - arrow},${aBase}L${ax},${aTip}L${ax + arrow},${aBase}Z`);

  tip.attr("transform", `translate(${gx},${gy})`)
    .raise()
    .interrupt()
    .transition().duration(100).style("opacity", 1);
}

function hideTip() {
  tip.interrupt().transition().duration(150).style("opacity", 0);
}

// ---- Interactions ----------------------------------------------------------
if (hover) {
  cells
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      if (typeof d3.pointer !== "function") { d = event; event = d3.event; }
      d3.select(this)
        .attr("stroke", axisCol)
        .attr("stroke-width", 1.2)
        .attr("stroke-opacity", 0.9);
      showTip(d);
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "none");
      hideTip();
    });

  if (legendCells) {
    legendCells
      .style("cursor", "pointer")
      .on("mouseover", function (event, b) {
        if (typeof d3.pointer !== "function") { b = event; event = d3.event; }
        cells.interrupt().style("opacity", d => d.bucket === b ? 1 : 0.15);
        legendCells.attr("stroke", bb => bb === b ? axisCol : "none")
          .attr("stroke-width", 1.2);
      })
      .on("mouseout", function () {
        cells.interrupt().transition().duration(150).style("opacity", 1);
        legendCells.attr("stroke", "none");
      });
  }
}
