#' Create an interactive area chart
#'
#' An area chart for time series: the area under the line is filled with a
#' soft gradient. It shares the interactions of \code{\link{line_chart}()}:
#' a crosshair tooltip, range buttons (1M, 6M, YTD, 1Y, ...), a navigator
#' with a brush under the chart, drag-to-zoom (double-click to reset) and,
#' with several series, a clickable legend and labels at the end of each
#' area.
#'
#' With \code{baseline}, the area is drawn between the line and that value
#' instead of zero, and \code{negativeFill} colours the part below it, which
#' suits anomalies, balances or profit and loss.
#'
#' The data can be one column (\code{y = "value"}), several columns
#' (\code{y = c("a", "b")}), long data with a \code{group} column, or a
#' \code{ts} / \code{mts} object passed directly as \code{data}. Several
#' series are drawn on top of each other; use
#' \code{\link{stacked_area_chart}()} to stack them.
#'
#' @inheritParams line_chart
#' @param x The time variable: a \code{Date}, a \code{POSIXct} date-time, a
#'   "yyyy-mm-dd" character column or a number. Not needed when \code{data}
#'   is a \code{ts} object.
#' @param y The value variable(s): one column name, or several to draw one
#'   area per column.
#' @param fill The colour of the area (and of its line). A single colour, or
#'   one colour per series (a named vector maps colours to series). Defaults
#'   to a built-in palette.
#' @param stroke Optional. The colour of the line on top of the area.
#'   Defaults to the colour of the area.
#' @param strokeWidth The width of the line on top of the area. Defaults to
#'   2; use 0 to hide the line.
#' @param opacity Optional. The opacity of the area fill (from 0 to 1). When
#'   \code{NULL} (default), the area is filled with a gradient that fades
#'   towards the axis.
#' @param ytitle Optional. The title of the y-axis, shown above the axis.
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param axisCol The color of the axis text, ticks and titles. Defaults to
#'   "#333333".
#' @param group Optional. For long data, the column whose values name the
#'   series (one area per value).
#' @param baseline Optional. A number: the area is drawn between the line and
#'   this value instead of zero.
#' @param negativeFill Optional. With \code{baseline}, the colour of the area
#'   (and line) below the baseline.
#' @param yZero Logical. Force the y axis to include 0. When \code{NULL}
#'   (default), it does unless \code{baseline} is given.
#'
#' @return An interactive SVG area chart.
#' @export
#'
#' @examples
#' # A ts object can be passed directly
#' area_chart(AirPassengers, y = "passengers", title = "Airline passengers")
#'
#' # The classic data frame interface still works
#' airpassengers <- data.frame(
#'   passengers = as.matrix(AirPassengers),
#'   date = zoo::as.Date(time(AirPassengers))
#' )
#' area_chart(
#'   data = airpassengers,
#'   x = "date",
#'   y = "passengers",
#'   fill = "purple"
#' )
#'
#' # Above and below a baseline
#' library(ggplot2) # for the economics data set
#' area_chart(
#'   economics, x = "date", y = "psavert",
#'   baseline = mean(economics$psavert),
#'   fill = "#3ca951", negativeFill = "#ff725c",
#'   valueSuffix = "%",
#'   title = "US personal savings rate",
#'   subtitle = "Above and below its long-run average"
#' )
#'
area_chart <- function(
  data,
  x = NULL,
  y = NULL,
  fill = NULL,
  stroke = NULL,
  strokeWidth = 2,
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
  opacity = NULL,
  axisCol = "#333333",
  width = NULL,
  height = NULL,
  group = NULL,
  baseline = NULL,
  negativeFill = NULL,
  curve = "curveLinear",
  points = FALSE,
  yZero = NULL,
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

  if (!is.null(baseline) && (!is.numeric(baseline) || length(baseline) != 1 || !is.finite(baseline))) {
    stop("'baseline' must be a single number")
  }
  if (!is.null(opacity) && (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1)) {
    stop("'opacity' must be a single number between 0 and 1")
  }
  if (is.null(strokeWidth)) strokeWidth <- 2
  if (!is.numeric(strokeWidth) || length(strokeWidth) != 1 || strokeWidth < 0) {
    stop("'strokeWidth' must be a single number, 0 or more")
  }
  if (is.null(yZero)) yZero <- is.null(baseline)

  line_widget(
    data = data, x = x, y = y, group = group, colors = fill,
    strokeWidth = if (strokeWidth == 0) 1 else strokeWidth, curve = curve,
    area = TRUE, points = points, yZero = yZero,
    events = events, bands = bands, hlines = hlines, legend = legend,
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
      kind = "area",
      areaOpacity = opacity,
      lineColor = if (strokeWidth == 0) "none" else stroke,
      baseline = baseline,
      negativeFill = negativeFill
    )
  )
}
