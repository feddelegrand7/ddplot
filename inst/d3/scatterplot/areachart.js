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

let x = d3.scaleUtc()
    .domain(d3.extent(data, d => new Date(d[options.x])))
    .range([margin.left, width - margin.right])

// Setting the scale of the y variable
let y = d3
  .scaleLinear()
  .domain([0, ymax])
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
  .text(options.xtitle);

// Rendering the y-axis title
svg
  .append("text")
  .attr("transform", "translate(" + 0 + " ," + height / 2 + ") rotate(-90)")
  .attr("dy", "0.8em")
  .style("text-anchor", "middle")
  .style("font-size", options.ytitleFontSize)
  .style("font-family", options.font)
  .text(options.ytitle);

// Rendering the chart title

svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", margin.top / 2 + 5)
  .attr("text-anchor", "middle")
  .attr("dx", "0em")
  .style("font-size", options.titleFontSize)
  .style("font-family", options.font)
  .text(options.title);


// Creating a clip path

svg.append("clipPath")
.attr("id", "chart-area")
.append("rect")
.attr("x", margin.left + 1)
.attr("y", margin.top)
.attr("width", width - margin.left)
.attr("height", height - margin.bottom);


// Rendering the scatter plot

let area = d3.area()
             .x(d => x(new Date(d[options.x])))
             .y0(function() { return y.range()[0]; })
             .y1(d => y(d[options.y]))


svg
  .attr("id", options.id)
  .style("background-color", options.bgcol)
  .append('g')
  .attr("clip-path", "url(#chart-area)")
  .append("path")
  .datum(data)
  .attr("fill", options.fill)
  .attr("stroke", options.stroke)
  .attr("stroke-width", options.strokeWidth)
  .attr("stroke-linejoin", "round")
  .attr("stroke-linecap", "round")
  .attr('d', area)


