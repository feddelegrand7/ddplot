// Setting the margin object
let margin = { top: 50, right: 50, bottom: 50, left: 50 };

let bins = d3.histogram().thresholds(options.bins)(options.x);

// Setting the scaling of the x variable
let xScale = d3
  .scaleLinear()
  .domain([bins[0].x0, bins[bins.length - 1].x1])
  .range([margin.left, width - margin.right]);

// Setting the scaling of the y variable
let yScale = d3
  .scaleLinear()
  .domain([0, d3.max(bins, (d) => d.length)])
  .nice()
  .range([height - margin.bottom, margin.top]);

// Setting the x-axis
xAx = d3.axisBottom(xScale).ticks(options.xticks);

// Setting the y-axis
yAx = d3.axisLeft(yScale).ticks(options.yticks);

// Rendering the x-axis
gx = svg
  .append("g")
  .attr("transform", "translate(0," + (height - margin.bottom) + ")")
  .call(xAx)
  .attr("font-size", options.xFontSize);

// Rendering the y-axis
gy = svg
  .append("g")
  .attr("transform", "translate(" + margin.left + ", 0)")
  .call(yAx)
  .attr("font-size", options.yFontSize);

// Removing the y axis line
gx.call((g) => g.select(".domain").remove());

// Rendering the x-axis title
svg
  .append("text")
  .attr("transform", "translate(" + width / 2 + " ," + (height - 5) + ")")
  .attr("dx", "0em")
  .attr("dy", "-0.4em")
  .style("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", options.xtitleFontSize)
  .text(options.xtitle)
  .style("fill", options.axisCol);

// Rendering the y-axis title
svg
  .append("text")
  .attr("transform", "translate(" + 0 + " ," + height / 2 + ") rotate(-90)")
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .style("font-size", options.ytitleFontSize)
  .style("font-family", options.font)
  .text(options.ytitle)
  .style("fill", options.axisCol);

// Rendering the chart title
svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", margin.top / 2)
  .attr("text-anchor", "middle")
  .attr("dx", "0em")
  .style("font-size", options.titleFontSize)
  .style("font-family", options.font)
  .text(options.title)
  .style("fill", options.axisCol);

// Modifying the color of the ticks and labels
svg.selectAll(".tick line").attr("stroke", options.axisCol);
svg.selectAll(".tick text").style("fill", options.axisCol);
svg.selectAll("path.domain").attr("stroke", options.axisCol);

svg
  .attr("viewBox", [0, 0, width, height])
  .style("background-color", options.bgcol);

let clipPathId = "chart-area" + Math.floor(Math.random() * 100);

svg
  .append("clipPath")
  .attr("id", clipPathId)
  .append("rect")
  .attr("x", margin.left + 1)
  .attr("y", margin.top)
  .attr("width", width - margin.left)
  .attr("height", height - margin.bottom);

svg
  .attr("viewBox", [0, 0, width, height])
  .style("background-color", options.bgcol)
 

svg
  .append("g")
  .attr("clip-path", "url(#" + clipPathId + ")")
  .append("g")
  .attr("fill", options.fill)
  .selectAll("rect")
  .data(bins)
  .enter()
  .append("rect")
  .attr("x", (d) => xScale(d.x0) + 1)
  .attr("width", (d) => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
  .attr("y", (d) => yScale(d.length))
  .attr("height", (d) => yScale(0) - yScale(d.length))
  .attr("opacity", options.opacity)
  .attr("stroke", options.stroke)
  .attr("stroke-width", options.strokeWidth);
