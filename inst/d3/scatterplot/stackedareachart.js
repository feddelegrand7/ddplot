// Setting the margin object
margin = {
  top: 40,
  left: 50,
  right: 120,
  bottom: 40,
};

let dataColumns = options.columnNames; 

let color = d3.scaleOrdinal()
              .domain(dataColumns)
              .range(d3["scheme" + options.colorCategory]);

// Setting the scale of the x variable

let x = d3
  .scaleUtc()
  .domain(d3.extent(data, (d) => new Date(d[options.x])))
  .range([margin.left, width - margin.right]);

// Setting the scale of the y variable

let series = d3.stack().keys(dataColumns)(data);

let y = d3
  .scaleLinear()
  .domain([
      0,
      d3.max(series, d => d3.max(d, d => d[1]))])
  .range([height - margin.top, margin.bottom])



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

// Rendering the area chart

// first we need a clipPath 

let clipPathId = "chart-area" + Math.floor(Math.random() * 100);

svg.append("clipPath")
   .attr("id", clipPathId)
   .append('rect')
   .attr('x', margin.left + 1)
   .attr('y', margin.top)
   .attr('width', width - margin.left)
   .attr('height', height - margin.bottom)


let area = d3.area()
            .x((d) => x(new Date(d.data[options.x])))
            .y0((d) => y(d[0]))
            .y1((d) => y(d[1]))
            .curve(d3[options.curve])



svg
  .attr("viewBox", [0, 0, width, height])
  .style('background-color', options.bgcol)
  .append('g')
  .attr('clip-path', "url(#" + clipPathId + ")")
  .append("g")
  .selectAll("path")
  .data(series)
  .enter()
  .append("path")
     .attr("fill", ({key}) => color(key))
     .attr("d", area)
     .style('stroke', options.stroke)
     .style('stroke-width', options.strokeWidth)
  .append('title')
     .text(({key}) => key)

// Adding legends 

let size = options.legendBoxSize;
svg.selectAll('myrectangles')
   .data(dataColumns.reverse())
   .enter()
   .append('rect')
   .attr('x', width - margin.right + 5)
   .attr('y', (d, i) => margin.top + i * (size + 5))
   .attr('width', size)
   .attr('height', size)
   .style('fill', d => color(d))

svg.selectAll('mylabels')
   .data(dataColumns)
   .enter()
   .append('text')
   .attr('x', width - margin.right + size * 1.5)
   .attr('y', (d, i) => margin.top + i * (size + 5) + (size/2) + 1)
   .style("fill", d => color(d))
   .text(d => d)
   .attr("text-anchor", "left")
   .style("alignment-baseline", "middle")
   .style('fill', options.axisCol)
   .style('font-size', `${options.legendTextSize}px`)

