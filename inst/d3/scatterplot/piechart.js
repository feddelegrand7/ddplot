let pie = d3.pie()
    .sort(null)
    .value(d => d[options.value])

let radius = Math.min(width, height) / 2 -1;

let pieData = pie(data)

let colorSeq = d3.scaleOrdinal(d3.schemeCategory10);



let arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius)


svg
.append('g')
.attr('transform', `translate(${radius},${radius})`)
.selectAll(null)
    .data(pieData)
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => colorSeq(d.data[options.label]))
    .attr('stroke', 'grey')
    .style('stroke-width', '1px');


