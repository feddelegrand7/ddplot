#' Create a gauge (speedometer) chart.
#'
#' @description
#' A gauge (speedometer) chart displays a single quantitative measure
#' against colored zones (warning and danger) with a needle indicator.
#' By default the needle animates on load, sweeping up from the minimum to
#' the value and settling with a small wobble, like a car dashboard.
#'
#' @param value Numeric. The current value to display on the gauge.
#' @param min Numeric. The minimum value of the gauge. Defaults to 0.
#' @param max Numeric. The maximum value of the gauge. Defaults to 100.
#' @param title Character. Label shown inside the gauge. Defaults to "".
#' @param warning_zone Numeric. The value at which the warning (first) arc begins.
#' Defaults to 75\% of max.
#' @param warning_color The color of the warning zone arc. Defaults to "orange".
#' @param danger_zone Numeric. The value at which the danger (second, critical) arc begins.
#' Defaults to 90\% of max.
#' @param danger_color The color of the danger zone arc. Defaults to "red".
#' @param arc_bg_color The background color of the gauge arc track. Defaults to "#ddd".
#' @param needle_color The color of the needle. Defaults to "crimson".
#' @param pivot_color The color of the center pivot circle. Defaults to "steelblue".
#' @param title_font_size The font size of the gauge title. Defaults to 16.
#' @param value_font_size The font size of the current value label. Defaults to 14.
#' @param font The font family used for all text. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bg_col The background color of the SVG. Defaults to "white".
#' @param animate Logical. When \code{TRUE} (default), the needle sweeps from
#' the minimum up to the value on load and settles with a small wobble. Set to
#' \code{FALSE} to draw the needle at the value immediately with no animation.
#' @param animation_duration Numeric. Duration of the needle sweep in
#' milliseconds. Defaults to 1500.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG gauge chart.
#' @export
#'
#' @examples
#' # Basic usage
#' gauge_chart(value = 8, title = "Memory")
#'
#' # Custom warning and danger thresholds
#' gauge_chart(
#'   value = 72,
#'   min = 0,
#'   max = 100,
#'   title = "CPU Load",
#'   warning_zone  = 60,
#'   warning_color = "orange",
#'   danger_zone   = 80,
#'   danger_color  = "red"
#' )
#'
#' # Non-percentage range (response time in ms)
#' gauge_chart(
#'   value = 530,
#'   min = 0,
#'   max = 1000,
#'   title = "Response (ms)",
#'   warning_zone  = 400,
#'   danger_zone   = 700
#' )
gauge_chart <- function(
    value,
    min = 0,
    max = 100,
    title = "",
    warning_zone = NULL,
    warning_color = "orange",
    danger_zone = NULL,
    danger_color = "red",
    arc_bg_color = "#ddd",
    needle_color = "crimson",
    pivot_color = "steelblue",
    title_font_size = 16,
    value_font_size = 14,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col = "white",
    animate = TRUE,
    animation_duration = 1500,
    width = NULL,
    height = NULL
) {

  if (!is.numeric(value) || length(value) != 1) {
    stop("'value' must be a single numeric value.")
  }

  if (min >= max) {
    stop("'min' must be less than 'max'.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(warning_zone)) {
    warning_zone <- min + 0.75 * (max - min)
  }

  if (is.null(danger_zone)) {
    danger_zone <- min + 0.90 * (max - min)
  }

  r2d3::r2d3(
    data = value,
    script = ddplot_script("gaugechart.js"),
    options = list(
      min = min,
      max = max,
      title = title,
      warningZone = warning_zone,
      warningColor = warning_color,
      dangerZone = danger_zone,
      dangerColor = danger_color,
      arcBgColor = arc_bg_color,
      needleColor = needle_color,
      pivotColor = pivot_color,
      titleFontSize = title_font_size,
      valueFontSize = value_font_size,
      font = font,
      bgcol = bg_col,
      animate = animate,
      animationDuration = animation_duration
    ),
    width = width,
    height = height
  )
}
