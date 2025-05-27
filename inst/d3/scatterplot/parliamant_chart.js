const centerX = width / 2;
const centerY = height / 2;

const seatSize = options.seatSize || 6;
const padding = options.padding || 2;
const fontFamily = options.font || "Verdana, Geneva, Tahoma, sans-serif";
const innerRadiusRatio = 0.3;
const bgColor = options.bgcol || "#CAD0D3";
const title = options.title || "";
const titleFontSize = options.titleFontSize || 22;
const legendX = options.legendX || (width - 150);
const legendY = options.legendY || 20;

svg.style("background-color", bgColor);

const seats = [];
data.forEach(d => {
  for (let i = 0; i < d.number_of_seats; i++) {
    seats.push({ political_party: d.political_party });
  }
});

const color = d3.scaleOrdinal()
  .domain(data.map(d => d.political_party))
  .range(d3.schemeCategory10);

function estimateOptimalRows(seats, width, height) {
  const outerR = Math.min(width, height) / 2 - 40;
  for (let rows = 4; rows <= 30; rows++) {
    const layout = computeLayout(seats, rows, outerR, innerRadiusRatio);
    if (layout.length >= seats.length) return rows;
  }
  return 30;
}

function computeLayout(seats, rows, outerR, innerRatio) {
  const innerR = outerR * innerRatio;
  let layout = [];
  let index = 0;

  for (let row = 0; row < rows; row++) {
    const r = outerR - ((outerR - innerR) / (rows - 1)) * row;
    const seatsInRow = Math.floor(Math.PI * r / (seatSize + padding));
    for (let i = 0; i < seatsInRow && index < seats.length; i++) {
      const angle = Math.PI * (i / (seatsInRow - 1));
      layout.push({
        x: centerX - r * Math.cos(angle),
        y: centerY - r * Math.sin(angle),
        political_party: seats[index].political_party
      });
      index++;
    }
  }
  return layout;
}

const maxR = Math.min(width, height) / 2 - 40;
const rows = options.maxRows || estimateOptimalRows(seats, width, height);
const seatPositions = computeLayout(seats, rows, maxR, innerRadiusRatio);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "parliament-tooltip")
  .style("position", "absolute")
  .style("padding", "6px 10px")
  .style("background", "white")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("font-family", fontFamily)
  .style("font-size", "12px")
  .style("pointer-events", "none")
  .style("opacity", 0);

svg.selectAll("circle")
  .data(seatPositions)
  .enter()
  .append("circle")
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r", seatSize / 2)
  .attr("fill", d => color(d.political_party))
  .attr("stroke", "#444")
  .attr("stroke-width", 0.4)
  .on("mouseover", function (event, d) {
    tooltip.transition().duration(200).style("opacity", 1);
    tooltip.html(`${d.political_party}`);
  })
  .on("mousemove", function (event) {
    tooltip
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", function () {
    tooltip.transition().duration(200).style("opacity", 0);
  });

const legend = svg.append("g")
  .attr("transform", `translate(${legendX}, ${legendY})`);

data.forEach((d, i) => {
  const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
  g.append("rect")
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", color(d.political_party));
  g.append("text")
    .attr("x", 16)
    .attr("y", 10)
    .attr("fill", "#333")
    .style("font-family", fontFamily)
    .style("font-size", "12px")
    .text(d.political_party);
});

if (title) {
  svg.append("text")
    .attr("x", centerX)
    .attr("y", height - 100)
    .attr("text-anchor", "middle")
    .style("font-family", fontFamily)
    .style("font-size", `${titleFontSize}px`)
    .style("fill", "#111")
    .text(title);
}
