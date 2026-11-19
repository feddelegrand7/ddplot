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
#' instead of zero, and \code{negative_fill} colours the part below it, which
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
#' @param stroke_width The width of the line on top of the area. Defaults to
#'   2; use 0 to hide the line.
#' @param opacity Optional. The opacity of the area fill (from 0 to 1). When
#'   \code{NULL} (default), the area is filled with a gradient that fades
#'   towards the axis.
#' @param y_title Optional. The title of the y-axis, shown above the axis.
#' @param bg_col The background color of the SVG. Defaults to "white".
#' @param axis_col The color of the axis text, ticks and titles. Defaults to
#'   "#333333".
#' @param group Optional. For long data, the column whose values name the
#'   series (one area per value).
#' @param baseline Optional. A number: the area is drawn between the line and
#'   this value instead of zero.
#' @param negative_fill Optional. With \code{baseline}, the colour of the area
#'   (and line) below the baseline.
#' @param y_zero Logical. Force the y axis to include 0. When \code{NULL}
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
#'   fill = "#3ca951", negative_fill = "#ff725c",
#'   value_suffix = "%",
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
  stroke_width = 2,
  x_ticks = NULL,
  y_ticks = NULL,
  x_title = NULL,
  x_title_font_size = 13,
  y_title = NULL,
  y_title_font_size = 13,
  title = NULL,
  title_font_size = 20,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bg_col = "white",
  opacity = NULL,
  axis_col = "#333333",
  width = NULL,
  height = NULL,
  group = NULL,
  baseline = NULL,
  negative_fill = NULL,
  curve = "curveLinear",
  points = FALSE,
  y_zero = NULL,
  events = NULL,
  bands = NULL,
  h_lines = NULL,
  legend = NULL,
  end_labels = NULL,
  tooltip = TRUE,
  navigator = TRUE,
  range_buttons = TRUE,
  zoom = TRUE,
  animate = TRUE,
  value_format = NULL,
  value_prefix = "",
  value_suffix = "",
  date_format = NULL,
  subtitle = NULL,
  subtitle_font_size = 13,
  x_font_size = 11,
  y_font_size = 11,
  grid_col = "#e9e9e9"
) {

  if (!is.null(baseline) && (!is.numeric(baseline) || length(baseline) != 1 || !is.finite(baseline))) {
    stop("'baseline' must be a single number")
  }
  if (!is.null(opacity) && (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1)) {
    stop("'opacity' must be a single number between 0 and 1")
  }
  if (is.null(stroke_width)) stroke_width <- 2
  if (!is.numeric(stroke_width) || length(stroke_width) != 1 || stroke_width < 0) {
    stop("'stroke_width' must be a single number, 0 or more")
  }
  if (is.null(y_zero)) y_zero <- is.null(baseline)

  line_widget(
    data = data, x = x, y = y, group = group, colors = fill,
    stroke_width = if (stroke_width == 0) 1 else stroke_width, curve = curve,
    area = TRUE, points = points, y_zero = y_zero,
    events = events, bands = bands, h_lines = h_lines, legend = legend,
    end_labels = end_labels, tooltip = tooltip, navigator = navigator,
    range_buttons = range_buttons, zoom = zoom, animate = animate,
    value_format = value_format, value_prefix = value_prefix, value_suffix = value_suffix,
    date_format = date_format, x_ticks = x_ticks, y_ticks = y_ticks,
    x_title = x_title, x_title_font_size = x_title_font_size,
    y_title = y_title, y_title_font_size = y_title_font_size,
    title = title, title_font_size = title_font_size,
    subtitle = subtitle, subtitle_font_size = subtitle_font_size,
    x_font_size = x_font_size, y_font_size = y_font_size, font = font,
    bg_col = bg_col, grid_col = grid_col, axis_col = axis_col,
    width = width, height = height,
    extra = list(
      kind = "area",
      areaOpacity = opacity,
      lineColor = if (stroke_width == 0) "none" else stroke,
      baseline = baseline,
      negativeFill = negative_fill
    )
  )
}
