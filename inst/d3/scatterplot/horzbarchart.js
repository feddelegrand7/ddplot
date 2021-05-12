let margin = {
    top: 50, 
    right: 0, 
    bottom: 50, 
    left: 100
}

let barHeight = 25; 

let x = d3.scaleLinear()
          .domain([0, d3.max(data, d => d[options.value])])
          .range([margin.left, width - margin.right])

let y = d3.scaleBand()
          .domain(d3.range(data.length))
          .rangeRound([margin.top, height - margin.bottom])
          .padding(options.paddingWidth)


          

        
let format = x.tickFormat(20, data.format); 

let xAxis = g => g
        .attr('transform', 
        `translate(0, ${margin.top})`)
        .call(d3.axisTop(x).ticks(width/80, data.format))
        .call(g => g.select('.domain').remove())

let yAxis = g => g
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y).tickFormat(i => data[i][options.label]))

svg.attr('viewBox', [0, 0, width, height])
   .attr('id', options.id)

svg.append('g')
   .attr('fill', options.fill)
   .selectAll('rect')
   .data(data)
   .enter()
   .append('rect')
   .attr('x', x(0))
   .attr('y', (d, i) => y(i))
   .attr('width', d => x(d[options.value]) - x(0))
   .attr('height', y.bandwidth())

svg.append('g')
    .call(xAxis)

svg.append('g')
   .call(yAxis)