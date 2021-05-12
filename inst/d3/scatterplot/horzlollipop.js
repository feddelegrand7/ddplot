// Setting the margin object
let margin = {
  top: 50,
  right: 10,
  bottom: 50,
  left: 100,
};

// Sorting the data

data.sort(function (a, b) {
  if (options.sort === "none") {
    return null;
  } else if (options.sort === "ascending") {
    return d3.ascending(a[options.value], b[options.value]);
  } else {
    return d3.descending(a[options.value], b[options.value]);
  }
});

let yScale = d3
  .scaleBand()
  .domain(
    data.map(function (d) {
      return d[options.label];
    })
  )
  .range([margin.bottom, height - margin.top])
  .padding(1);

let xScale = d3
  .scaleLinear()
  .domain([0, d3.max(data, (d) => d[options.value])])
  .range([margin.left, width - margin.right]);

xAx = d3.axisBottom(xScale).ticks(options.valueTicks);
yAx = d3.axisLeft(yScale).ticks(options.labelTicks);

gx = svg
  .append("g")
  .attr("transform", "translate(0," + (height - margin.bottom) + ")")
  .call(xAx)
  .attr("font-size", options.valueFontSize);

gy = svg
  .append("g")
  .attr("transform", "translate(" + margin.left + ", 0)")
  .call(yAx)
  .attr("font-size", options.labelFontSize);

// Removing the y and x axis line
gy.call((g) => g.selectAll("line").remove());
gx.call((g) => g.select(".domain").remove());

// Rendering the x-axis title
svg
  .append("text")
  .attr("transform", "translate(" + width / 2 + " ," + (height - 1) + ")")
  .attr("dx", "0em")
  .attr("dy", "-0.4em")
  .style("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", options.valueTitleFontSize)
  .text(options.valueTitle);

// Rendering the y-axis title
svg
  .append("text")
  .attr("transform", "translate(" + 0 + " ," + height / 2 + ") rotate(-90)")
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .style("font-size", options.labelTitleFontSize)
  .style("font-family", options.font)
  .text(options.labelTitle);

// Rendering the chart title
svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", margin.top / 2)
  .attr("text-anchor", "middle")
  .attr("dx", "0em")
  .style("font-size", options.titleFontSize)
  .style("font-family", options.font)
  .text(options.title);

// Rendering the lines

svg.style("background-color", options.bgcol);

svg
  .selectAll("myline")
  .data(data)
  .enter()
  .append("line")
  .attr("x1", (d) => xScale(d[options.value]))
  .attr("y1", (d) => yScale(d[options.label]))
  .attr("x2", xScale(0))
  .attr("y2", (d) => yScale(d[options.label]))
  .attr("stroke", options.lineStroke)
  .attr("stroke-width", options.lineStrokeWidth);

// Rendering the circles
svg
  .selectAll("mycircle")
  .data(data)
  .enter()
  .append("circle")
  .attr("cx", (d) => xScale(d[options.value]))
  .attr("cy", (d) => yScale(d[options.label]))
  .attr("r", options.circleRadius)
  .style("fill", options.circleFill)
  .attr("stroke", options.circleStroke)
  .attr("stroke-width", options.circleStrokeWidth);
