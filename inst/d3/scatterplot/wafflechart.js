const nRows        = Math.max(1, Math.round(+options.rows || 10));
const nCols        = Math.max(1, Math.round(+options.cols || 10));
const userTotal    = options.total ? +options.total : null;
const colorsRaw    = options.colors;
const palette      = colorsRaw == null ? [] :
                     (Array.isArray(colorsRaw) ? colorsRaw : [colorsRaw]);
const emptyCol     = options.emptyCol || "#e5e5e5";
const cellPadding  = options.cellPadding == null ? 2 : +options.cellPadding;
const cellRadius   = options.cellRadius  == null ? 2 : +options.cellRadius;
const direction    = options.direction === "col" ? "col" : "row";
const showLegend   = options.legend !== false;
const legendSize   = options.legendFontSize || 12;
const hoverOn      = options.hover   !== false;
const animate      = options.animate !== false;
const animDuration = options.animationDuration == null ? 1200 : +options.animationDuration;
const title        = options.title   || null;
const titleSize    = options.titleFontSize || 16;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const textCol      = options.textCol || "black";

const defaultPalette = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
                        "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"];

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const rowsIn = Array.isArray(data) ? data : [];

const cats = rowsIn
  .map((d, i) => ({
    category: String(d.category),
    value:    d.value == null ? NaN : +d.value,   // NA arrives as null
    color:    palette.length ? palette[i % palette.length]
                             : defaultPalette[i % defaultPalette.length]
  }))
  .filter(d => isFinite(d.value) && d.value >= 0);

const valueSum = cats.reduce((s, d) => s + d.value, 0);

if (!cats.length || !(valueSum > 0)) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", textCol)
    .text("No data available for waffle_chart()");
  return;
}

const total  = userTotal && userTotal >= valueSum ? userTotal : valueSum;
const nCells = nRows * nCols;

// Largest-remainder allocation. When total > sum of values, an "empty"
// pseudo-category takes part in the allocation so every cell is accounted for.
const parts = cats.slice();
if (total > valueSum) {
  parts.push({ category: null, value: total - valueSum, color: emptyCol, empty: true });
}

parts.forEach((d, i) => {
  const exact = d.value / total * nCells;
  d.cells = Math.floor(exact);
  d.rem   = exact - d.cells;
  d.order = i;
  d.pct   = d.value / total * 100;
});

let leftover = nCells - parts.reduce((s, d) => s + d.cells, 0);
parts.slice()
  .sort((a, b) => (b.rem - a.rem) || (a.order - b.order))
  .forEach(d => { if (leftover > 0) { d.cells += 1; leftover -= 1; } });

// Expand into one record per cell, in fill order
const cells = [];
parts.forEach(p => {
  for (let k = 0; k < p.cells; k++) cells.push({ part: p, idx: cells.length });
});

const fmtInt   = d3.format(",");
const fmtDec   = d3.format(",.2~f");
const fmtValue = v => Number.isInteger(v) ? fmtInt(v) : fmtDec(v);
const fmtPct   = v => (Math.round(v * 10) / 10).toFixed(1) + "%";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const titleOffset = title ? titleSize + 16 : 0;
const pad = 12;

// Estimate legend width from the longest label (no DOM measuring needed)
const legendLabel = d => d.category + "  " + fmtPct(d.pct);
const swatch      = Math.round(legendSize * 1.1);
const longest     = d3.max(cats, d => legendLabel(d).length) || 0;
const legendW     = showLegend ? swatch + 8 + longest * legendSize * 0.62 : 0;
const itemH       = legendSize + 10;

let availW = width  - 2 * pad;
let availH = height - titleOffset - 2 * pad;

// Legend on the right if there is room, otherwise below the grid
let legendPos = "none";
if (showLegend) {
  const rightCell  = Math.min((availW - legendW - 20) / nCols, availH / nRows);
  const bottomRows = Math.ceil(cats.length / Math.max(1, Math.floor(availW / (legendW + 16))));
  const bottomCell = Math.min(availW / nCols, (availH - bottomRows * itemH - 12) / nRows);
  legendPos = rightCell >= bottomCell ? "right" : "bottom";
}

let gridW = availW, gridH = availH;
let perRow = 1, legendRows = 0;
if (legendPos === "right") {
  gridW = availW - legendW - 20;
} else if (legendPos === "bottom") {
  perRow     = Math.max(1, Math.floor(availW / (legendW + 16)));
  legendRows = Math.ceil(cats.length / perRow);
  gridH      = availH - legendRows * itemH - 12;
}

const cellSize = Math.max(2, Math.min(gridW / nCols, gridH / nRows));
const gridPxW  = cellSize * nCols;
const gridPxH  = cellSize * nRows;
const gap      = Math.min(cellPadding, cellSize * 0.4);
const side     = Math.max(1, cellSize - gap);
const radius   = Math.min(cellRadius, side / 2);

// Centre grid (+ legend if on the right) horizontally; grid vertically
const blockW = legendPos === "right" ? gridPxW + 20 + legendW : gridPxW;
const gridX  = pad + Math.max(0, (availW - blockW) / 2);
const gridY  = titleOffset + pad + Math.max(0, (gridH - gridPxH) / 2);

cells.forEach(c => {
  let r, col;
  if (direction === "row") { col = c.idx % nCols; r = Math.floor(c.idx / nCols); }
  else                     { r = c.idx % nRows;   col = Math.floor(c.idx / nRows); }
  c.x = col * cellSize + gap / 2;
  c.y = (nRows - 1 - r) * cellSize + gap / 2;
});

const g = svg.append("g")
  .attr("transform", `translate(${gridX},${gridY})`);

// Transparent backdrop so moving across the gaps does not count as leaving
g.append("rect")
  .attr("width", gridPxW).attr("height", gridPxH)
  .attr("fill", bgcol).attr("fill-opacity", 0);

const rects = g.selectAll("rect.waffle-cell")
  .data(cells)
  .enter()
  .append("rect")
  .attr("class", "waffle-cell")
  .attr("rx", radius).attr("ry", radius)
  .attr("fill", d => d.part.color);

if (animate && animDuration > 0) {
  const step = animDuration / Math.max(1, cells.length);
  rects
    .attr("x", d => d.x + side / 2).attr("y", d => d.y + side / 2)
    .attr("width", 0).attr("height", 0)
    .transition("load")
    .delay(d => d.idx * step)
    .duration(Math.max(250, step * 6))
    .ease(d3.easeBackOut)
    .attr("x", d => d.x).attr("y", d => d.y)
    .attr("width", side).attr("height", side);
} else {
  rects
    .attr("x", d => d.x).attr("y", d => d.y)
    .attr("width", side).attr("height", side);
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------
let legendItems = null;
if (legendPos !== "none") {
  const lg = svg.append("g").attr("class", "waffle-legend");
  let lx0, ly0;
  if (legendPos === "right") {
    lx0 = gridX + gridPxW + 20;
    ly0 = gridY + Math.max(0, (gridPxH - cats.length * itemH) / 2);
  } else {
    const rowW = Math.min(perRow, cats.length) * (legendW + 16) - 16;
    lx0 = pad + Math.max(0, (availW - rowW) / 2);
    ly0 = gridY + gridPxH + 16;
  }

  legendItems = lg.selectAll("g.waffle-legend-item")
    .data(cats)
    .enter()
    .append("g")
    .attr("class", "waffle-legend-item")
    .attr("transform", (d, i) => {
      if (legendPos === "right") { d.lx = lx0; d.ly = ly0 + i * itemH; }
      else {
        d.lx = lx0 + (i % perRow) * (legendW + 16);
        d.ly = ly0 + Math.floor(i / perRow) * itemH;
      }
      return `translate(${d.lx},${d.ly})`;
    });

  // Hit area covering the whole entry
  legendItems.append("rect")
    .attr("x", -2).attr("y", -2)
    .attr("width", legendW + 4).attr("height", swatch + 4)
    .attr("fill", bgcol).attr("fill-opacity", 0);

  legendItems.append("rect")
    .attr("width", swatch).attr("height", swatch)
    .attr("rx", Math.min(cellRadius, swatch / 2)).attr("ry", Math.min(cellRadius, swatch / 2))
    .attr("fill", d => d.color);

  const lt = legendItems.append("text")
    .attr("x", swatch + 8)
    .attr("y", swatch / 2)
    .attr("dy", "0.35em")
    .attr("font-size", legendSize)
    .attr("font-family", fontFamily)
    .attr("fill", textCol);
  lt.append("tspan").text(d => d.category + "  ");
  lt.append("tspan").attr("font-weight", "bold").text(d => fmtPct(d.pct));
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", titleSize + 6)
    .attr("text-anchor", "middle")
    .attr("font-size", titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill", textCol)
    .text(title);
}

// ---------------------------------------------------------------------------
// Hover: highlight a category + in-SVG label (NOT a body-appended <div>, which
// is hidden when the widget is embedded in R Markdown / pkgdown).
// ---------------------------------------------------------------------------
if (hoverOn) {
  const tip = svg.append("g")
    .attr("class", "waffle-tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0);
  const tipRect = tip.append("rect")
    .attr("rx", 4).attr("ry", 4)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);
  const tipText = tip.append("text")
    .attr("font-family", fontFamily)
    .attr("font-size", 12)
    .attr("fill", "#222");
  const tipPadX = 8, tipPadY = 6;

  // ax, ay: anchor point in SVG coordinates; anchorW: anchor width to clear
  // preferLeft: place the label to the left of the anchor when it fits
  function showTip(part, ax, ay, anchorW, preferLeft) {
    tipText.selectAll("tspan").remove();
    tipText.append("tspan")
      .attr("x", tipPadX).attr("dy", tipPadY + 11)
      .attr("font-weight", "bold")
      .text(part.category);
    tipText.append("tspan")
      .attr("x", tipPadX).attr("dy", 15)
      .text(fmtValue(part.value) + "  ·  " + fmtPct(part.pct) +
            "  ·  " + part.cells + (part.cells === 1 ? " cell" : " cells"));

    const bb   = tipText.node().getBBox();
    const boxW = bb.width  + 2 * tipPadX;
    const boxH = bb.height + 2 * tipPadY;
    tipRect
      .attr("x", bb.x - tipPadX).attr("y", bb.y - tipPadY)
      .attr("width", boxW).attr("height", boxH);

    const xOff = bb.x - tipPadX, yOff = bb.y - tipPadY;
    let tx;
    if (preferLeft && ax - 8 - boxW >= 2) tx = ax - 8 - boxW;
    else {
      tx = ax + anchorW + 8;
      if (tx + boxW > width) tx = ax - 8 - boxW;
    }
    tx = Math.max(2, Math.min(tx, width - boxW - 2)) - xOff;
    let ty = ay - boxH / 2;
    ty = Math.max(2, Math.min(ty, height - boxH - 2)) - yOff;

    tip.attr("transform", `translate(${tx},${ty})`)
      .raise()
      .interrupt()
      .transition().duration(120).style("opacity", 1);
  }

  function highlight(part) {
    rects.interrupt("hover").transition("hover").duration(150)
      .attr("fill-opacity", d => d.part === part ? 1 : 0.15);
    if (legendItems) {
      legendItems.interrupt("hover").transition("hover").duration(150)
        .style("opacity", d => d === part ? 1 : 0.35);
    }
  }

  function reset() {
    rects.interrupt("hover").transition("hover").duration(200)
      .attr("fill-opacity", 1);
    if (legendItems) {
      legendItems.interrupt("hover").transition("hover").duration(200)
        .style("opacity", 1);
    }
    tip.interrupt().transition().duration(200).style("opacity", 0);
  }

  // d3.select(this).datum() works with both the D3 v5 and v6+ event APIs
  rects
    .style("cursor", d => d.part.empty ? null : "pointer")
    .on("mouseover", function () {
      const c = d3.select(this).datum();
      if (c.part.empty) { reset(); return; }
      highlight(c.part);
      showTip(c.part, gridX + c.x, gridY + c.y + side / 2, side);
    });

  g.on("mouseleave", reset);

  if (legendItems) {
    legendItems
      .style("cursor", "pointer")
      .on("mouseover", function () {
        const part = d3.select(this).datum();
        highlight(part);
        if (legendPos === "right") {
          showTip(part, part.lx, part.ly + swatch / 2, 0, true);
        } else {
          showTip(part, part.lx - 8, part.ly - 30, 0, false);
        }
      })
      .on("mouseleave", reset);
  }
}
