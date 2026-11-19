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
#' @param y_lower The column holding the lower bound of the band.
#' @param y_upper The column holding the upper bound of the band.
#' @param fill The colour of the band (and of the central line). A single
#'   colour, or one colour per group (a named vector maps colours to groups).
#'   Defaults to a built-in palette.
#' @param stroke Optional. The colour of the band's outline. Without
#'   \code{y}, the outline defaults to a faded line in the band's colour.
#' @param stroke_width Optional. The width of the band's outline. Defaults to
#'   1.
#' @param opacity Optional. The opacity of the band (from 0 to 1). Defaults
#'   to 0.3, or 0.22 with a central line.
#' @param y_title Optional. The title of the y-axis, shown above the axis.
#' @param bg_col The background color of the SVG. Defaults to "white".
#' @param axis_col The color of the axis text, ticks and titles. Defaults to
#'   "#333333".
#' @param y Optional. A column drawn as a line inside the band.
#' @param group Optional. The column whose values name the bands (one band
#'   per value, long data).
#' @param line_width The width of the central line. Defaults to 2.
#' @param y_zero Logical. Force the y axis to include 0. Defaults to
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
#'   y_lower = "passengers_lower",
#'   y_upper = "passengers_upper",
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
#'   temps, x = "date", y_lower = "low", y_upper = "high", y = "mean",
#'   group = "city", value_format = ".1f", value_suffix = " °C",
#'   title = "Daily temperatures", subtitle = "Mean, with the daily minimum and maximum"
#' )
#'
area_band <- function(
  data,
  x,
  y_lower,
  y_upper,
  fill = NULL,
  stroke = NULL,
  stroke_width = NULL,
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
  y = NULL,
  group = NULL,
  line_width = 2,
  curve = "curveLinear",
  y_zero = FALSE,
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

  if (!is.data.frame(data)) stop("'data' must be a data frame")
  if (is.null(data[[x]]) || is.null(data[[y_lower]]) || is.null(data[[y_upper]])) {
    stop("Please check that x and y_lower and y_upper belong to the specified data frame")
  }
  if (!is.null(opacity) && (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1)) {
    stop("'opacity' must be a single number between 0 and 1")
  }
  if (!is.null(stroke_width) && (!is.numeric(stroke_width) || length(stroke_width) != 1 || stroke_width < 0)) {
    stop("'stroke_width' must be a single number, 0 or more")
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
    data = data, x = x, y = y, group = group, lower = y_lower, upper = y_upper,
    colors = fill, stroke_width = line_width, curve = curve, y_zero = y_zero,
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
      kind = "band",
      bandOpacity = band_opacity,
      bandStroke = if (!is.null(stroke_width) && stroke_width == 0) "none" else stroke,
      bandStrokeWidth = stroke_width
    )
  )
}
