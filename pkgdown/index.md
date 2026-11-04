```{=html}
<div class="dd-hero">
<div class="dd-hero-text">
<p class="dd-eyebrow">R package &middot; D3.js &middot; SVG</p>
<h1 class="dd-hero-title">Interactive D3 charts, one R function at a time</h1>
<p class="dd-lead"><strong>ddplot</strong> turns a data frame into an interactive SVG chart. More than 40 chart types, from everyday line and bar charts to chord diagrams and sunbursts, that work in the RStudio viewer, R Markdown, Quarto and Shiny. No JavaScript required.</p>
<div class="dd-cta">
<a class="btn btn-primary btn-lg" href="articles/Start.html">Get started</a>
<a class="btn btn-outline-primary btn-lg" href="articles/gallery.html">Browse the gallery</a>
</div>
<div class="dd-install"><span class="dd-prompt">&gt;</span><code>install.packages("ddplot")</code><button type="button" class="dd-copy" data-copy='install.packages("ddplot")' aria-label="Copy install command">Copy</button></div>
</div>
<div class="dd-hero-art" aria-hidden="true">
<svg viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="420" height="300" rx="18" class="dd-art-bg"/>
<g class="dd-art-grid">
<line x1="40" x2="390" y1="70" y2="70"/><line x1="40" x2="390" y1="125" y2="125"/><line x1="40" x2="390" y1="180" y2="180"/><line x1="40" x2="390" y1="235" y2="235"/>
</g>
<path class="dd-art-area" d="M40,200 C80,190 100,150 140,160 S200,200 240,150 S310,80 350,100 S380,90 390,75 L390,250 L40,250 Z"/>
<path class="dd-art-line dd-l1" d="M40,200 C80,190 100,150 140,160 S200,200 240,150 S310,80 350,100 S380,90 390,75"/>
<path class="dd-art-line dd-l2" d="M40,170 C80,175 110,200 150,190 S210,130 250,140 S320,170 350,150 S380,130 390,128"/>
<path class="dd-art-line dd-l3" d="M40,230 C90,225 120,215 160,220 S230,205 270,200 S330,190 360,180 S385,182 390,178"/>
<line class="dd-art-cross" x1="250" x2="250" y1="55" y2="250"/>
<circle class="dd-art-dot dd-d1" cx="250" cy="139" r="6"/>
<circle class="dd-art-dot dd-d2" cx="250" cy="140" r="6"/>
<g class="dd-art-tip">
<rect x="262" y="28" width="118" height="62" rx="9"/>
<text x="274" y="50" class="dd-art-tip-title">Q3 2026</text>
<circle cx="279" cy="66" r="4" class="dd-d1"/><text x="290" y="70">Revenue  148</text>
<circle cx="279" cy="81" r="4" class="dd-d2" /><text x="290" y="85">Costs  139</text>
</g>
</svg>
</div>
</div>
```

```{=html}
<div class="dd-features">
<div class="dd-feature">
<div class="dd-feature-icon">1</div>
<h3>One function per chart</h3>
<p>Pass a data frame and column names. Every chart shares the same vocabulary: <code>title</code>, <code>xtitle</code>, <code>fill</code>, <code>bgcol</code>, <code>font</code>&hellip;</p>
</div>
<div class="dd-feature">
<div class="dd-feature-icon">2</div>
<h3>Interactive by default</h3>
<p>Tooltips, hover highlights, sorting and animations. <code>line_chart()</code> adds zoom, range buttons, a navigator and annotations.</p>
</div>
<div class="dd-feature">
<div class="dd-feature-icon">3</div>
<h3>Works where R works</h3>
<p>RStudio viewer, R Markdown, Quarto, and Shiny through <code>d3Output()</code> and <code>renderD3()</code>. Save any chart as a standalone HTML file.</p>
</div>
</div>
```

## Start with the essentials {.dd-section-title}

```{=html}
<p class="dd-section-lead">The charts most projects need. Each card opens the chart's guide with live examples.</p>
```

```{=html}
<div class="dd-gallery dd-gallery-featured">
<div class="dd-card"><div class="dd-thumb"><img src="gallery/line_chart.png" alt="Line chart" loading="lazy"></div><div class="dd-card-body"><div class="dd-card-meta"><span class="dd-card-cat">Time series</span><span class="dd-badge dd-badge-interactive">interactive</span></div><h3><a class="stretched-link" href="articles/time-series.html#line_chart">Line chart</a></h3><p>One or many series, with zoom, a navigator, annotations and forecast ribbons.</p><a class="dd-card-ref" href="reference/line_chart.html"><code>line_chart()</code></a></div></div>
<div class="dd-card"><div class="dd-thumb"><img src="gallery/bar_chart.png" alt="Bar chart" loading="lazy"></div><div class="dd-card-body"><div class="dd-card-meta"><span class="dd-card-cat">Comparisons</span></div><h3><a class="stretched-link" href="articles/comparisons.html#bar_chart">Bar chart</a></h3><p>Compare a value across categories, sorted or not.</p><a class="dd-card-ref" href="reference/bar_chart.html"><code>bar_chart()</code></a></div></div>
<div class="dd-card"><div class="dd-thumb"><img src="gallery/scatter_plot.png" alt="Scatter plot" loading="lazy"></div><div class="dd-card-body"><div class="dd-card-meta"><span class="dd-card-cat">Relationships</span></div><h3><a class="stretched-link" href="articles/relationships.html#scatter_plot">Scatter plot</a></h3><p>The relationship between two numeric variables.</p><a class="dd-card-ref" href="reference/scatter_plot.html"><code>scatter_plot()</code></a></div></div>
<div class="dd-card"><div class="dd-thumb"><img src="gallery/histogram.png" alt="Histogram" loading="lazy"></div><div class="dd-card-body"><div class="dd-card-meta"><span class="dd-card-cat">Distributions</span></div><h3><a class="stretched-link" href="articles/distributions.html#histogram">Histogram</a></h3><p>The distribution of a single numeric variable.</p><a class="dd-card-ref" href="reference/histogram.html"><code>histogram()</code></a></div></div>
<div class="dd-card"><div class="dd-thumb"><img src="gallery/stacked_area_chart.png" alt="Stacked area chart" loading="lazy"></div><div class="dd-card-body"><div class="dd-card-meta"><span class="dd-card-cat">Time series</span><span class="dd-badge dd-badge-interactive">interactive</span></div><h3><a class="stretched-link" href="articles/time-series.html#stacked_area_chart">Stacked area chart</a></h3><p>A total and how each component contributes over time.</p><a class="dd-card-ref" href="reference/stacked_area_chart.html"><code>stacked_area_chart()</code></a></div></div>
<div class="dd-card"><div class="dd-thumb"><img src="gallery/horz_bar_chart.png" alt="Horizontal bar chart" loading="lazy"></div><div class="dd-card-body"><div class="dd-card-meta"><span class="dd-card-cat">Comparisons</span></div><h3><a class="stretched-link" href="articles/comparisons.html#horz_bar_chart">Horizontal bar chart</a></h3><p>Many categories or long labels.</p><a class="dd-card-ref" href="reference/horz_bar_chart.html"><code>horz_bar_chart()</code></a></div></div>
</div>
```

```{=html}
<p class="dd-more"><a href="articles/gallery.html">See all 42 charts in the gallery &rarr;</a></p>
```

## Browse by family {.dd-section-title}

```{=html}
<p class="dd-section-lead">Families are ordered from the charts you are most likely to need to the more specialised ones.</p>
```

```{=html}
<div class="dd-families">
<a class="dd-family" href="articles/time-series.html"><img src="gallery/streamgraph.png" alt="" loading="lazy"><div><h3>Time series and trends <span>7</span></h3><p>line, area, stacked area, band, streamgraph, calendar</p></div></a>
<a class="dd-family" href="articles/comparisons.html"><img src="gallery/dumbbell_chart.png" alt="" loading="lazy"><div><h3>Comparing categories <span>11</span></h3><p>bars, lollipops, dumbbell, slope, bump, waterfall, radar</p></div></a>
<a class="dd-family" href="articles/distributions.html"><img src="gallery/violin_plot.png" alt="" loading="lazy"><div><h3>Distributions <span>5</span></h3><p>histogram, violin, beeswarm, ridgeline</p></div></a>
<a class="dd-family" href="articles/relationships.html"><img src="gallery/hexbin_plot.png" alt="" loading="lazy"><div><h3>Relationships and flows <span>3</span></h3><p>scatter, hexbin, chord diagram</p></div></a>
<a class="dd-family" href="articles/composition.html"><img src="gallery/treemap_chart.png" alt="" loading="lazy"><div><h3>Part-to-whole and hierarchies <span>7</span></h3><p>pie, treemap, waffle, sunburst, mosaic, rose, parliament</p></div></a>
<a class="dd-family" href="articles/kpis.html"><img src="gallery/gauge_chart.png" alt="" loading="lazy"><div><h3>KPIs and monitoring <span>4</span></h3><p>gauge, bullet, liquid fill, pulse grid</p></div></a>
<a class="dd-family" href="articles/playful.html"><img src="gallery/flower.png" alt="" loading="lazy"><div><h3>Playful indicators <span>5</span></h3><p>heart, glass, plant, flame, flower</p></div></a>
</div>
```

## A first chart {.dd-section-title}

A `ts` object, or a data frame with a date column and one or several value columns, is all `line_chart()` needs:

``` r
library(ddplot)

line_chart(
  EuStockMarkets,
  transform = "index",
  title = "European stock indices",
  subtitle = "Rebased to 100 at the first visible date"
)
```

Hover to read every series at a date, drag on the chart to zoom, click the legend to hide a series. The [Get started](articles/Start.html) guide goes further, and covers Shiny.

## Installation {.dd-section-title}

Install the released version from CRAN:

``` r
install.packages("ddplot")
```

Or the development version from GitHub:

``` r
remotes::install_github("feddelegrand7/ddplot")
```

## Code of Conduct {.dd-section-title}

Please note that the ddplot project is released with a [Contributor Code of Conduct](https://contributor-covenant.org/version/2/0/CODE_OF_CONDUCT.html). By contributing to this project, you agree to abide by its terms.
