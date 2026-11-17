# ddplot 0.2.1

### Improvements:
- `bar_chart()` and `horz_bar_chart()` have been rewritten and now share one interactive D3 script. New arguments: `group` with `position = "grouped"`, `"stacked"` or `"percent"` (switchable from buttons on the chart), `agg` (`"sum"`, `"mean"`, `"median"`, `"min"`, `"max"`, `"count"`) so raw rows can be passed directly (leave `y`/`value` empty to count rows), `labels` (values on the bars), `highlight`, `refLines`, `negativeFill`, `cornerRadius`, `legend`, `controls`, `tooltip`, `animate`, `valueFormat`/`valuePrefix`/`valueSuffix`, `subtitle` and `gridCol`. Bars grow in when drawn; the tooltip shows the value, share of total and rank (or every group and the total); buttons re-sort the bars with an animation; the legend hides (click) or isolates (double-click) groups. Negative values are supported. Long category labels are rotated or truncated automatically. In Shiny, `input$<id>_clicked` returns the clicked category and group, and the layout, sort order and hidden groups are kept across `renderD3()` updates. Existing calls keep working; the default look changed (white background, palette colour instead of crimson unless `fill` is set, value labels, rounded bar ends, value-axis title defaults to the column name, smaller fonts), and `xticks` in `bar_chart()` is no longer used.
- `lollipop_chart()` and `horz_lollipop()` have been rewritten on the same interactive script as the bar charts. New arguments: `group` (one lollipop per group, side by side, with a click/double-click legend), `agg` (raw rows are aggregated; leave `y`/`value` empty to count rows), `labels`, `highlight`, `refLines`, `negativeFill`, `legend`, `controls`, `tooltip`, `animate`, `valueFormat`/`valuePrefix`/`valueSuffix`, `subtitle`, `gridCol` and `opacity`. Lollipops grow in when drawn, show their values, can be re-sorted from buttons on the chart, and show their value, rank and (for sums and counts) share of the total on hover. Negative values are drawn downwards (or to the left). In Shiny, `input$<id>_clicked` returns the clicked category and group, and the sort order and hidden groups are kept across `renderD3()` updates. Breaking changes: several rows with the same category are now combined (summed by default, see `agg`) instead of being drawn on top of each other (use `beeswarm_plot()` to show every row); `y`/`value` are now optional; the default look changed (palette colour instead of maroon and lime, `lineStrokeWidth = 2`, `circleRadius = 6`, a ring in the background colour around the dots, value-axis title defaults to the column name, smaller fonts); `xticks` and `labelTicks` are no longer used.
- In `bar_chart()` and `horz_bar_chart()`, the tooltip no longer shows a share of the total or a total when the values are means, medians, minima or maxima (`agg`), and, in the side-by-side layout, categories are then sorted by the average of their groups rather than their total.
- `area_chart()`, `stacked_area_chart()` and `area_band()` have been rewritten on the interactive script of `line_chart()`: they get its crosshair tooltip, range buttons, navigator, drag-to-zoom (double-click to reset), click/double-click legend, end labels, `events`, `bands`, `hlines`, value and date formats, `subtitle`, and `ts`/`mts` input (for `area_chart()` and `stacked_area_chart()`). `area_chart()` gains several series (`y = c(...)` or `group`), `baseline` and `negativeFill` (area above and below a value in two colours) and `curve`. `stacked_area_chart()` gains Stacked / 100% buttons (`position`, `controls`), a tooltip with every layer, its share and the total, layers that re-stack when one is hidden, long data (`y` + `group`), `y` to choose the columns and `colors`; missing values count as zero when stacking and negative values are stacked below zero. `area_band()` gains an optional central line (`y`, `lineWidth`), one band per `group`, and a tooltip with the range. In Shiny, the zoom, the hidden series and the stacked layout are kept across `renderD3()` updates. Existing calls keep working, but the defaults changed: white background, palette colours instead of crimson (and of the D3 Category10 scheme in `stacked_area_chart()`; `colorCategory` still picks a scheme), smaller fonts, a gradient fill in `area_chart()` unless `opacity` is given, `strokeWidth = 1` and `opacity = 0.85` in `stacked_area_chart()`, a semi-transparent band in `area_band()`. `stacked_area_chart()` now stacks the numeric columns only, and `legendBoxSize`/`legendTextSize` are no longer used.
- `scatter_plot()` has been upgraded. New arguments: `group` (categorical colours with a click/double-click legend, or a colour gradient for a numeric column), `sizeBy`/`sizeRange` (bubble chart), `label`/`showLabels` (tooltip titles and collision-free point labels), `tooltip` (extra columns), `trend = "lm"`/`"loess"` with a 95% confidence band (`ci`) and fit statistics on hover, `xScale`/`yScale = "log"`, `hlines`/`vlines`, `xFormat`/`yFormat`, `subtitle` and `gridCol`. Hovering a point shows its values with guides to both axes; dragging a box selects points, which can be zoomed into (double-click resets). In Shiny, `input$<id>_selected` and `input$<id>_clicked` return the selected and clicked row numbers, and hidden groups and the zoom are kept across `renderD3()` updates. Existing calls keep working; the default look changed (white background, grid lines, palette colour instead of crimson unless `col` is set, `size = 4`, `opacity = 0.8`, axis titles default to the column names, smaller title font sizes).

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
