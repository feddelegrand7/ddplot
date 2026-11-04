# ddplot 0.2.0

### Improvements:
- `line_chart()` has been rewritten for time series work. It now supports several series (wide `y = c(...)`, long `group =`, or `ts`/`mts` objects passed directly), a crosshair tooltip showing every series at the hovered date, a click/double-click legend, direct end labels, range buttons (1M ... All), a navigator brush, drag-to-zoom with an auto-rescaling y axis, `transform = "index"`/`"percent"` rebasing, `rollmean`, `lower`/`upper` forecast ribbons, `bands`, `events`, `hlines`, `yScale = "log"`, `area` and `points`. In Shiny, the zoom range and hidden series are kept across `renderD3()` updates. Existing calls keep working; the default look changed (white background, `strokeWidth = 2`, `titleFontSize = 20`, `xtitleFontSize`/`ytitleFontSize = 13`, left-aligned title, y-axis title above the axis, palette color instead of crimson for a single series unless `stroke` is set, y axis fitted to the data unless `yZero = TRUE` or `area = TRUE`).

### Documentation:
- The website has been redesigned (Bootstrap 5, light and dark themes). It has a new home page, a filterable gallery of every chart, and one guide per family of charts (time series, comparisons, distributions, relationships, part-to-whole, KPIs, playful indicators), ordered from the most commonly needed charts to the more specialised ones. The reference index is grouped the same way. The "Get started" vignette is now a short introduction; the chart-by-chart examples moved to the website guides.

### Bug fixes:
- Charts now redraw correctly in `Shiny` with `r2d3::d3Output()` / `r2d3::renderD3()`. Previously r2d3 re-ran the chart script on the same SVG, so updates were drawn on top of the previous chart (or not visibly at all) and animation timers kept running. A shared preamble (`ddplotreset.js`) now clears the previous render and stops its timers before each redraw; this also fixes stacked timers after a widget resize.

### Adding new functions:
- `slope_chart`: Tufte / New York Times style slopegraph comparing two values per category, with direction colouring, `highlight`, label collision avoidance and hover-to-focus.
- `bump_chart`: ranking-over-time chart (Financial Times, The Economist, FiveThirtyEight) with ranks computed per period (or supplied via `ranked = TRUE`), rank circles, end labels and `highlight`.
- `ridgeline_plot`: "joy plot" of stacked kernel densities per group, with Gaussian/Epanechnikov kernels, `overlap`, `sort`, mean/median markers and hover tooltips.
- `treemap_chart`: Shneiderman / NYT budget style treemap with optional `group` hierarchy, several tiling algorithms, auto-fitting labels, group headers and an in-SVG tooltip.
- `waffle_chart`: Pew / FiveThirtyEight style square-grid part-to-whole chart using largest-remainder allocation, row or column fill, animated entry and hover highlighting.
- `sunburst_chart`: zoomable sunburst for hierarchical data (inspired by Apache ECharts), with click-to-zoom, branch highlighting on hover and smooth arc transitions.
- `radar_chart`: radar / spider chart (inspired by Chart.js) with polygon or circular grid, shared or per-axis scaling, center-out animation, point tooltips and a click-to-toggle legend.
- `calendar_heatmap`: GitHub-style calendar heatmap (inspired by Frappe Charts) with one panel per year, Sunday/Monday week start, a hoverable "Less ... More" legend and a staggered fade-in.
- `chord_diagram`: chord diagram (inspired by Nivo) from an edge list or square matrix, with hover-to-fade, flow tooltips, gradient ribbons and click-to-pin.
- `streamgraph`: streamgraph (inspired by Highcharts) with wiggle/silhouette/expand baselines, inline layer labels, crosshair tooltip and a click-to-toggle legend.
- `violin_plot`: violin plot (inspired by Plotly.js) with per-group Gaussian KDE, inner box plot, mean line, jittered points and a summary-statistics tooltip.
- `mosaic_chart`: mosaic / Marimekko chart (inspired by Vega-Lite) with variable-width columns, 100%-stacked segments, in-cell labels and share tooltips.
- `radial_bar_chart`: concentric circular progress rings (inspired by ApexCharts' radialBar) with rounded arcs, sweep-in animation and a center readout that updates on hover.
- `rose_chart`: Nightingale rose / polar area chart (inspired by AntV G2) with area-true square-root radii, optional stacking, pop-out hover and a clickable legend.
- `hexbin_plot`: hexagonal binning plot (inspired by Observable Plot's hexbin) coloured by count on a linear, sqrt or log scale, with optional size-by-count and a continuous legend.

# ddplot 0.1.0

### Breaking changes: 
- Now all function are `snake_case` named

### Adding new functions:
- `pulse_grid`
- `gauge_chart`
- `bullet_chart`
- `beeswarm_plot`
- `dumbbell_chart`
- `waterfall_chart`
- `liquid_chart`

# ddplot 0.0.2

### Adding new functions: 
- `flame`
- `glass_fill`
- `heart_fill`
- `flower`
- `plant_growth`
- `parliament_chart`

# ddplot 0.0.1

* Initial release.
