margin = {
  top: 40,
  left: 50,
  right: 30,
  bottom: 40
}



let xmin = d3.min(data, d => d[options.x])
let xmax = d3.max(data, d => d[options.x])

let ymin = d3.min(data, d => d[options.y])
let ymax = d3.max(data, d => d[options.y])

let x = d3.scaleLinear()
          .domain(
             [
              xmin - (xmin * (1 / 100)),
              xmax
             ]
            )
          .range([margin.left, width - margin.right])
          .nice()


let y = d3.scaleLinear()
          .domain(
            [
              ymin - (ymin * (1 / 100)),
              ymax
            ]
            )
          .range([height - margin.top, margin.bottom])
          .nice()


xS = d3.axisBottom(x).ticks(options.xticks)
yS = d3.axisLeft(y).ticks(options.yticks)


svg.append('g')
   .attr('transform', 'translate(0,' + (height-margin.bottom) + ')')
   .call(xS)


svg.append('g')
   .attr('transform', 'translate(' + margin.left + ', 0)')
   .call(yS)


//Axes labels

// x axis
svg.append("text")
  .attr("transform", "translate(" + (width/2) + " ," + (height - 5) + ")")
  .attr("dx", "1em")
  .style("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", "12pt")
  .text(options.xlab);

// y axis
svg.append("text")
.attr("transform", "translate(" + 0 + " ," + (height/2) + ") rotate(-90)")
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", "12pt")
  .text(options.ylab);

//Create the chart title
svg.append("text")
  .attr("x", (width/2))
  .attr("y", (margin.top/2))
  .attr("text-anchor", "middle")
  .attr("dx", "1em")
  .style("font-size", "14pt")
  .style("font-family", options.font)
  .text(options.title);


svg.selectAll('circle')
   .data(data)
   .enter()
   .append('circle')
   .attr('cx', d => x(d[options.x]))
   .attr('cy', d => y(d[options.y]))
   .attr('r', function(d) {

  if (typeof options.size == 'string') {
    return d[options.size]
  } else {
    return options.size
  }

   })
   .attr('fill', options.col)
   .attr('stroke', options.stroke)
   .attr('stroke-width', options.strokeWidth)
