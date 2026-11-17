#' Create an interactive band chart
#'
#' Draws a shaded band between a lower and an upper value over time, such as
#' a daily minimum and maximum, a confidence or forecast interval, or a
#' target range, optionally with a central line (\code{y}, for example the
#' mean or the median). With \code{group}, one band per group is drawn. It
#' shares the interactions of \code{\link{line_chart}()}: a crosshair tooltip
#' showing each band's range, range buttons, a navigator, drag-to-zoom
#' (double-click to reset) and a clickable legend.
#'
#' @inheritParams line_chart
#' @param x The time variable: a \code{Date}, a \code{POSIXct} date-time, a
#'   "yyyy-mm-dd" character column or a number.
#' @param yLower The column holding the lower bound of the band.
#' @param yUpper The column holding the upper bound of the band.
#' @param fill The colour of the band (and of the central line). A single
#'   colour, or one colour per group (a named vector maps colours to groups).
#'   Defaults to a built-in palette.
#' @param stroke Optional. The colour of the band's outline. Without
#'   \code{y}, the outline defaults to a faded line in the band's colour.
#' @param strokeWidth Optional. The width of the band's outline. Defaults to
#'   1.
#' @param opacity Optional. The opacity of the band (from 0 to 1). Defaults
#'   to 0.3, or 0.22 with a central line.
#' @param ytitle Optional. The title of the y-axis, shown above the axis.
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param axisCol The color of the axis text, ticks and titles. Defaults to
#'   "#333333".
#' @param y Optional. A column drawn as a line inside the band.
#' @param group Optional. The column whose values name the bands (one band
#'   per value, long data).
#' @param lineWidth The width of the central line. Defaults to 2.
#' @param yZero Logical. Force the y axis to include 0. Defaults to
#'   \code{FALSE}.
#'
#' @return An interactive SVG band chart.
#' @export
#'
#' @examples
#' airpassengers <- data.frame(
#'   passengers_lower = as.matrix(AirPassengers),
#'   passengers_upper = as.matrix(AirPassengers) + 40,
#'   date = zoo::as.Date(time(AirPassengers))
#' )
#'
#' area_band(
#'   data = airpassengers,
#'   x = "date",
#'   yLower = "passengers_lower",
#'   yUpper = "passengers_upper",
#'   fill = "#efb118",
#'   stroke = "#9c6b4e"
#' )
#'
#' # A band around a central line, one band per group
#' set.seed(1)
#' days <- seq(as.Date("2026-01-01"), by = "day", length.out = 120)
#' temps <- do.call(rbind, lapply(c("Oslo", "Madrid"), function(city) {
#'   base <- if (city == "Oslo") -2 else 9
#'   mid <- base + 8 * sin(seq_along(days) / 38) + rnorm(120, 0, 1)
#'   data.frame(date = days, city = city, mean = mid,
#'              low = mid - runif(120, 2, 5), high = mid + runif(120, 2, 5))
#' }))
#' area_band(
#'   temps, x = "date", yLower = "low", yUpper = "high", y = "mean",
#'   group = "city", valueFormat = ".1f", valueSuffix = " °C",
#'   title = "Daily temperatures", subtitle = "Mean, with the daily minimum and maximum"
#' )
#'
area_band <- function(
  data,
  x,
  yLower,
  yUpper,
  fill = NULL,
  stroke = NULL,
  strokeWidth = NULL,
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
  y = NULL,
  group = NULL,
  lineWidth = 2,
  curve = "curveLinear",
  yZero = FALSE,
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

  if (!is.data.frame(data)) stop("'data' must be a data frame")
  if (is.null(data[[x]]) || is.null(data[[yLower]]) || is.null(data[[yUpper]])) {
    stop("Please check that x and yLower and yUpper belong to the specified data frame")
  }
  if (!is.null(opacity) && (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1)) {
    stop("'opacity' must be a single number between 0 and 1")
  }
  if (!is.null(strokeWidth) && (!is.numeric(strokeWidth) || length(strokeWidth) != 1 || strokeWidth < 0)) {
    stop("'strokeWidth' must be a single number, 0 or more")
  }

  if (is.null(y)) {
    # band only: a value column with no values, named after the band
    y <- if ("Range" %in% names(data)) ".range" else "Range"
    data[[y]] <- NA_real_
    band_opacity <- if (is.null(opacity)) 0.3 else opacity
  } else {
    band_opacity <- if (is.null(opacity)) 0.22 else opacity
  }

  line_widget(
    data = data, x = x, y = y, group = group, lower = yLower, upper = yUpper,
    colors = fill, strokeWidth = lineWidth, curve = curve, yZero = yZero,
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
      kind = "band",
      bandOpacity = band_opacity,
      bandStroke = if (!is.null(strokeWidth) && strokeWidth == 0) "none" else stroke,
      bandStrokeWidth = strokeWidth
    )
  )
}
