// Setting the margin object
margin = {
  top: 40,
  left: 50,
  right: 30,
  bottom: 40,
};

// Setting the min and max of the y variable
let ymin = d3.min(data, (d) => d[options.y]);
let ymax = d3.max(data, (d) => d[options.y]);

// Setting the scale of the x variable

let x = d3
  .scaleUtc()
  .domain(d3.extent(data, (d) => new Date(d[options.x])))
  .range([margin.left, width - margin.right]);

// Setting the scale of the y variable

function isItNegative() {
  if(ymin < 0) {
    return ymin - (ymin * 10/100)
  } else {
    return 0
  }
}

let y = d3
  .scaleLinear()
  .domain([isItNegative(), ymax])
  .range([height - margin.top, margin.bottom])
  .nice();

// Setting the x-axis
xS = d3.axisBottom(x).ticks(options.xticks);

// Setting the y-axis
yS = d3.axisLeft(y).ticks(options.yticks);

// Rendering the x-axis
svg
  .append("g")
  .attr("transform", "translate(0," + (height - margin.bottom) + ")")
  .call(xS);

// Rendering the y-axis
svg
  .append("g")
  .attr("transform", "translate(" + margin.left + ", 0)")
  .call(yS);

// Rendering the x-axis title
svg
  .append("text")
  .attr("transform", "translate(" + width / 2 + " ," + (height - 5) + ")")
  .attr("dx", "0em")
  .style("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", options.xtitleFontSize)
  .text(options.xtitle)
  .style("fill", options.axisCol);

// Rendering the y-axis title
svg
  .append("text")
  .attr("transform", "translate(" + 2 + " ," + height / 2 + ") rotate(-90)")
  .attr("dy", "0.8em")
  .style("text-anchor", "middle")
  .style("font-size", options.ytitleFontSize)
  .style("font-family", options.font)
  .text(options.ytitle)
  .style("fill", options.axisCol);

// Rendering the chart title

svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", margin.top / 2 + 5)
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

// Rendering the scatter plot

let line = d3
  .line()
  .x((d) => x(new Date(d[options.x])))
  .y((d) => y(d[options.y]));

svg
  .style("background-color", options.bgcol)
  .append("path")
  .datum(data)
  .attr("fill", "none")
  .attr("stroke", options.stroke)
  .attr("stroke-width", options.strokeWidth)
  .attr("stroke-linejoin", "round")
  .attr("stroke-linecap", "round")
  .attr("d", line);
