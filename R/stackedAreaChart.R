#' Create an interactive stacked area chart
#'
#' Stacks several time series on top of each other, so you can read both the
#' total and how each component contributes to it. Buttons on the chart
#' switch between stacked values and shares of the total (100\%). It shares
#' the interactions of \code{\link{line_chart}()}: a crosshair tooltip
#' (every layer with its share, and the total), range buttons, a navigator,
#' drag-to-zoom (double-click to reset), labels at the end of each layer and
#' a legend: click an entry to hide a layer, double-click it to keep only
#' that layer; the other layers re-stack.
#'
#' Series can be given as wide data (by default, every numeric column other
#' than \code{x}; or the columns named in \code{y}), as long data (one
#' \code{y} column and a \code{group} column), or as an \code{mts} object.
#' Missing values count as zero when stacking, and negative values are
#' stacked below zero.
#'
#' @inheritParams line_chart
#' @param x The time variable: a \code{Date}, a \code{POSIXct} date-time, a
#'   "yyyy-mm-dd" character column or a number. Not needed when \code{data}
#'   is an \code{mts} object.
#' @param colorCategory Optional. The name of a D3 categorical colour scheme
#'   (for example "Tableau10", "Set2" or "Accent", see
#'   <https://github.com/d3/d3-scale-chromatic#categorical>), used when
#'   \code{colors} is not given. Defaults to the ddplot palette.
#' @param curve The curve type of the layers. Defaults to 'curveLinear';
#'   'curveMonotoneX' gives smooth layers that never cross. A complete list
#'   can be found here <https://github.com/d3/d3-shape#curves>.
#' @param stroke Optional. The colour of the line drawn on top of every
#'   layer, for example "white" to separate the layers. Defaults to the
#'   colour of each layer.
#' @param strokeWidth The width of the line on top of every layer. Defaults
#'   to 1.
#' @param opacity The opacity of the layers (from 0 to 1). Defaults to 0.85.
#' @param ytitle Optional. The title of the y-axis, shown above the axis.
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param axisCol The color of the axis text, ticks and titles. Defaults to
#'   "#333333".
#' @param legendBoxSize,legendTextSize Not used; kept for compatibility.
#' @param y Optional. The value columns (wide data), or the single value
#'   column of long data with \code{group}. When \code{NULL}, every numeric
#'   column other than \code{x} is stacked.
#' @param group Optional. For long data, the column whose values name the
#'   layers.
#' @param colors Optional. Colours of the layers, an unnamed vector
#'   (recycled) or a vector named by layer.
#' @param position "stacked" (default) or "percent" (shares of the total).
#'   It can be changed from the chart when \code{controls = TRUE}.
#' @param controls Logical. Show the Stacked / 100\% buttons. Defaults to
#'   \code{TRUE}.
#'
#' @return An interactive SVG stacked area chart.
#' @export
#' @examples
#' data <- data.frame(
#'   date = c(
#'     "2000-01-01", "2000-02-01", "2000-03-01", "2000-04-01",
#'     "2000-05-01", "2000-06-01", "2000-07-01",
#'     "2000-08-01", "2000-09-01", "2000-10-01"
#'   ),
#'   Trade = c(
#'     2000,1023, 983, 2793, 1821, 1837, 1792, 1853, 791, 739
#'   ),
#'   Manufacturing = c(
#'     734, 694, 739, 736, 685, 621, 708, 685, 667, 693
#'   ),
#'   Leisure = c(
#'     1782, 1779, 1789, 658, 675, 833, 786, 675, 636, 691
#'   ),
#'   Agriculture = c(
#'     655, 587,623, 517, 561, 2545, 636, 584, 559, 2504
#'   )
#' )
#'
#' stacked_area_chart(
#'   data = data,
#'   x = "date",
#'   curve = "curveMonotoneX",
#'   stroke = "white",
#'   title = "Employment by sector"
#' )
#'
#' # Long data, shown as shares of the total
#' library(ggplot2) # for the economics_long data set
#' stacked_area_chart(
#'   subset(economics_long, variable %in% c("pce", "psavert", "uempmed")),
#'   x = "date", y = "value", group = "variable",
#'   position = "percent"
#' )
#'
stacked_area_chart <- function(
  data,
  x = NULL,
  colorCategory = NULL,
  curve = "curveLinear",
  stroke = NULL,
  strokeWidth = 1,
  xticks = NULL,
  yticks = NULL,
  xtitle = NULL,
  xtitleFontSize = 13,
  ytitle = NULL,
  ytitleFontSize = 13,
  title = NULL,
  titleFontSize = 20,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "white",
  opacity = 0.85,
  axisCol = "#333333",
  legendBoxSize = NULL,
  legendTextSize = NULL,
  width = NULL,
  height = NULL,
  y = NULL,
  group = NULL,
  colors = NULL,
  position = c("stacked", "percent"),
  controls = TRUE,
  events = NULL,
  bands = NULL,
  hlines = NULL,
  legend = NULL,
  endLabels = NULL,
  tooltip = TRUE,
  navigator = TRUE,
  rangeButtons = TRUE,
  zoom = TRUE,
  animate = TRUE,
  valueFormat = NULL,
  valuePrefix = "",
  valueSuffix = "",
  dateFormat = NULL,
  subtitle = NULL,
  subtitleFontSize = 13,
  xFontSize = 11,
  yFontSize = 11,
  gridCol = "#e9e9e9"
) {

  position <- match.arg(position)
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a single number between 0 and 1")
  }
  if (is.null(strokeWidth)) strokeWidth <- 1
  if (!is.numeric(strokeWidth) || length(strokeWidth) != 1 || strokeWidth < 0) {
    stop("'strokeWidth' must be a single number, 0 or more")
  }
  if (!is.null(colorCategory) && (!is.character(colorCategory) || length(colorCategory) != 1)) {
    stop("'colorCategory' must be the name of a D3 colour scheme, such as \"Tableau10\"")
  }

  if (!stats::is.ts(data)) {
    if (!is.data.frame(data)) stop("'data' must be a data frame or an mts object")
    if (is.null(x) || is.null(data[[x]])) {
      stop("Please check that x belongs to the specified data frame")
    }
    if (is.null(y)) {
      if (!is.null(group)) stop("with 'group', give the value column in 'y'")
      y <- setdiff(names(data)[vapply(data, is.numeric, logical(1))], x)
      if (!length(y)) stop("there is no numeric column to stack")
    }
  }

  line_widget(
    data = data, x = x, y = y, group = group, colors = colors,
    strokeWidth = if (strokeWidth == 0) 1 else strokeWidth, curve = curve,
    area = FALSE, yZero = TRUE,
    events = events, bands = bands, hlines = hlines,
    legend = if (is.null(legend)) TRUE else legend,
    endLabels = endLabels, tooltip = tooltip, navigator = navigator,
    rangeButtons = rangeButtons, zoom = zoom, animate = animate,
    valueFormat = valueFormat, valuePrefix = valuePrefix, valueSuffix = valueSuffix,
    dateFormat = dateFormat, xticks = xticks, yticks = yticks,
    xtitle = xtitle, xtitleFontSize = xtitleFontSize,
    ytitle = ytitle, ytitleFontSize = ytitleFontSize,
    title = title, titleFontSize = titleFontSize,
    subtitle = subtitle, subtitleFontSize = subtitleFontSize,
    xFontSize = xFontSize, yFontSize = yFontSize, font = font,
    bgcol = bgcol, gridCol = gridCol, axisCol = axisCol,
    width = width, height = height,
    extra = list(
      kind = "stack",
      stack = position,
      stackControls = isTRUE(controls),
      areaOpacity = opacity,
      lineColor = if (strokeWidth == 0) "none" else stroke,
      colorScheme = if (is.null(colors)) colorCategory else NULL
    )
  )
}
