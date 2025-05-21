let margin = { top: 50, right: 50, bottom: 50, left: 50 };

// Parse data
let bins = d3.histogram()
  .thresholds(options.bins)(options.x);

// Scales
let xScale = d3.scaleLinear()
  .domain([bins[0].x0, bins[bins.length - 1].x1])
  .range([margin.left, width - margin.right]);

let yScale = d3.scaleLinear()
  .domain([0, d3.max(bins, d => d.length)])
  .nice()
  .range([height - margin.bottom, margin.top]);

// Setup SVG
svg
  .attr("viewBox", [0, 0, width, height])
  .style("background-color", options.bgcol || "white");

// Axis generators
let xAxis = d3.axisBottom(xScale).ticks(options.xticks || 10);
let yAxis = d3.axisLeft(yScale).ticks(options.yticks || 5);

// Render x-axis
svg.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(xAxis)
  .attr("font-size", options.xFontSize || 10)
  .selectAll("text")
  .style("fill", options.axisCol || "#000");

// Render y-axis
svg.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(yAxis)
  .attr("font-size", options.yFontSize || 10)
  .selectAll("text")
  .style("fill", options.axisCol || "#000");

// Axis labels
svg.append("text")
  .attr("x", width / 2)
  .attr("y", height - 5)
  .attr("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", options.xtitleFontSize || 12)
  .text(options.xtitle)
  .style("fill", options.axisCol || "#000");

svg.append("text")
  .attr("transform", `rotate(-90)`)
  .attr("x", -height / 2)
  .attr("y", 15)
  .attr("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", options.ytitleFontSize || 12)
  .text(options.ytitle)
  .style("fill", options.axisCol || "#000");

// Chart title
svg.append("text")
  .attr("x", width / 2)
  .attr("y", margin.top / 2)
  .attr("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", options.titleFontSize || 14)
  .text(options.title)
  .style("fill", options.axisCol || "#000");

// Tweak ticks and lines color
svg.selectAll(".tick line").attr("stroke", options.axisCol || "#000");
svg.selectAll("path.domain").attr("stroke", options.axisCol || "#000");

// Emoji rendering
let emoji = options.emoji || "🌸";

let emojiGroup = svg.append("g")
  .attr("font-size", options.emojiSize || 18)
  .attr("text-anchor", "middle")
  .style("font-family", options.font);

bins.forEach((bin) => {
  bin.forEach((_, i) => {
    emojiGroup.append("text")
      .text(emoji)
      .attr("x", xScale((bin.x0 + bin.x1) / 2))
      .attr("y", yScale(i + 1) - 50)
      .attr("opacity", 0)
      .attr("stroke", options.stroke || "none")
      .attr("stroke-width", options.strokeWidth || 0)
      .attr("text-anchor", "middle")
      .style("cursor", "pointer")
      .transition()
      .delay(Math.random() * 300)
      .duration(600)
      .attr("y", yScale(i + 1))
      .attr("opacity", options.opacity || 1)
      .on("end", function () {
        d3.select(this)
          .on("mouseover", function () {
            d3.select(this)
              .transition()
              .duration(300)
              .attr("transform", function () {
                let x = d3.select(this).attr("x");
                let y = d3.select(this).attr("y");
                return `rotate(-15,${x},${y})`;
              });
          })
          .on("mouseout", function () {
            d3.select(this)
              .transition()
              .duration(300)
              .attr("transform", null);
          });
      });
  });
});
