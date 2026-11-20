// chartkit.js -- shared helpers for the data charts box_plot(), density_plot(),
// heatmap_chart(), sankey_diagram(), network_graph(), likert_chart(),
// funnel_chart(), gantt_chart(), candlestick_chart() and circle_packing().
//
// Prepended after ddplotreset.js and playkit.js by chart_script()
// (R/chart_utils.R), so it lives in the same r2d3 function scope as the chart
// and can use the playkit helpers (pkTip, pkPtr, pkShiny, pkMeasure, ...).
// Works with D3 v5 and v6.

const CK_PALETTE = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
  "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0"];

// a d3 number format, falling back to `def` when the specifier is invalid
function ckFormat(spec, def) {
  try { return d3.format(spec || def); } catch (e) { return d3.format(def); }
}

// n colours: the user's (an array, "" = use the palette) or the palette
function ckPalette(n, user) {
  const u = pkArr(user);
  return d3.range(n).map(i => (u[i] !== undefined && u[i] !== null && u[i] !== "")
    ? u[i] : CK_PALETTE[i % CK_PALETTE.length]);
}

// Colours the svg, draws the title and returns what every chart needs:
//   font, textCol, bgcol, top (y below the title), measure(text, size, weight),
//   tip (pkTip), send (Shiny), hover, animate, empty(msg)
function ckInit(o, name) {
  const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
  const textCol = o.textCol || "#333333";
  const bgcol = o.bgcol || "white";
  svg.style("background-color", bgcol).style("font-family", font).attr("role", "img");
  const titleFs = pkPx(o.titleFontSize, 16);
  let top = 10;
  if (o.title) {
    svg.append("text").attr("x", width / 2).attr("y", 6 + titleFs).attr("text-anchor", "middle")
      .style("font-size", titleFs + "px").style("font-weight", 700).style("fill", textCol).text(o.title);
    top = titleFs + 20;
    svg.attr("aria-label", o.title);
  } else {
    svg.attr("aria-label", name.replace(/_/g, " "));
  }
  const measure = pkMeasure(svg, font);
  const tip = pkTip(svg, { font, color: textCol, bgcol, W: width, H: height, measure });
  return {
    font, textCol, bgcol, top, measure, tip,
    send: pkShiny(svg),
    hover: o.hover !== false,
    animate: o.animate !== false && !pkCalm,
    empty(msg) {
      svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle")
        .style("font-size", "14px").style("fill", textCol).text(msg || ("No data available for " + name + "()"));
    }
  };
}

// styles an axis drawn by d3.axis*()
function ckAxis(sel, ck, fs, keepDomain) {
  sel.selectAll(".tick text").style("font-size", (fs || 11) + "px").style("font-family", ck.font)
    .attr("fill", ck.textCol);
  sel.selectAll(".tick line").attr("stroke", ck.textCol).attr("stroke-opacity", 0.3);
  if (keepDomain) sel.select(".domain").attr("stroke", ck.textCol).attr("stroke-opacity", 0.45);
  else sel.select(".domain").remove();
  return sel;
}

// an axis title
function ckLabel(ck, text, x, y, fs, rotate) {
  if (!text) return null;
  return svg.append("text").attr("text-anchor", "middle")
    .attr("transform", `translate(${x},${y})` + (rotate ? " rotate(-90)" : ""))
    .style("font-size", (fs || 12) + "px").style("fill", ck.textCol).style("fill-opacity", 0.85).text(text);
}

// mouse handlers that receive (event, datum, element) with D3 v5 and v6
function ckOn(sel, h) {
  const wrap = f => function (a) { f(a, d3.select(this).datum(), this); };
  if (h.over) sel.on("mouseover.ck", wrap(h.over));
  if (h.move) sel.on("mousemove.ck", wrap(h.move));
  if (h.out) sel.on("mouseout.ck", wrap(h.out));
  if (h.click) sel.on("click.ck", wrap(h.click)).style("cursor", "pointer");
  return sel;
}

// the pointer position of an event, in svg coordinates
function ckPtr(a) { return pkPtr(a, svg.node()); }

// shows the tooltip at the pointer
function ckTipAt(ck, a, head, rows, headColor) {
  if (!ck.hover) return;
  const p = ckPtr(a);
  ck.tip.show(head, rows, p[0], p[1], headColor);
}

// a transition that is instant when animations are off
function ckT(sel, ck, ms, delay) {
  return sel.transition().duration(ck.animate ? ms : 0).delay(ck.animate ? (delay || 0) : 0);
}

// truncates a label to fit `w` pixels
function ckFit(ck, str, fs, w, weight) {
  str = String(str);
  if (ck.measure(str, fs, weight) <= w) return str;
  let s = str;
  while (s.length > 1 && ck.measure(s + "…", fs, weight) > w) s = s.slice(0, -1);
  return s.length > 1 ? s + "…" : "";
}

// a horizontal legend of swatches; returns its height. onClick(i) toggles items.
function ckLegend(ck, items, colors, y, fs, onClick) {
  fs = fs || 11;
  const g = svg.append("g").attr("class", "ck-legend");
  const widths = items.map(t => 14 + ck.measure(t, fs) + 14);
  const rows = [];
  let row = [], rw = 0;
  widths.forEach((w, i) => {
    if (row.length && rw + w > width - 20) { rows.push(row); row = []; rw = 0; }
    row.push(i); rw += w;
  });
  if (row.length) rows.push(row);
  const lh = fs + 8;
  const nodes = [];
  rows.forEach((r, k) => {
    const total = d3.sum(r, i => widths[i]);
    let x = (width - total) / 2;
    r.forEach(i => {
      const it = g.append("g").attr("transform", `translate(${x},${y + k * lh})`);
      it.append("rect").attr("y", -5).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", colors[i]);
      it.append("text").attr("x", 14).attr("dy", "0.32em").style("font-size", fs + "px").style("fill", ck.textCol).text(items[i]);
      if (onClick) {
        it.style("cursor", "pointer").on("click", () => onClick(i, it));
        it.append("rect").attr("x", -2).attr("y", -lh / 2).attr("width", widths[i] - 8).attr("height", lh).attr("fill", "transparent");
      }
      nodes[i] = it;
      x += widths[i];
    });
  });
  return { height: rows.length * lh, nodes };
}
