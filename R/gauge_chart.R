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
#' @param warningZone Numeric. The value at which the warning (first) arc begins.
#' Defaults to 75\% of max.
#' @param warningColor The color of the warning zone arc. Defaults to "orange".
#' @param dangerZone Numeric. The value at which the danger (second, critical) arc begins.
#' Defaults to 90\% of max.
#' @param dangerColor The color of the danger zone arc. Defaults to "red".
#' @param arcBgColor The background color of the gauge arc track. Defaults to "#ddd".
#' @param needleColor The color of the needle. Defaults to "crimson".
#' @param pivotColor The color of the center pivot circle. Defaults to "steelblue".
#' @param titleFontSize The font size of the gauge title. Defaults to 16.
#' @param valueFontSize The font size of the current value label. Defaults to 14.
#' @param font The font family used for all text. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param animate Logical. When \code{TRUE} (default), the needle sweeps from
#' the minimum up to the value on load and settles with a small wobble. Set to
#' \code{FALSE} to draw the needle at the value immediately with no animation.
#' @param animationDuration Numeric. Duration of the needle sweep in
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
#'   warningZone  = 60,
#'   warningColor = "orange",
#'   dangerZone   = 80,
#'   dangerColor  = "red"
#' )
#'
#' # Non-percentage range (response time in ms)
#' gauge_chart(
#'   value = 530,
#'   min = 0,
#'   max = 1000,
#'   title = "Response (ms)",
#'   warningZone  = 400,
#'   dangerZone   = 700
#' )
gauge_chart <- function(
    value,
    min = 0,
    max = 100,
    title = "",
    warningZone = NULL,
    warningColor = "orange",
    dangerZone = NULL,
    dangerColor = "red",
    arcBgColor = "#ddd",
    needleColor = "crimson",
    pivotColor = "steelblue",
    titleFontSize = 16,
    valueFontSize = 14,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol = "white",
    animate = TRUE,
    animationDuration = 1500,
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

  if (is.null(warningZone)) {
    warningZone <- min + 0.75 * (max - min)
  }

  if (is.null(dangerZone)) {
    dangerZone <- min + 0.90 * (max - min)
  }

  r2d3::r2d3(
    data = value,
    script = system.file("d3/scatterplot/gaugechart.js", package = "ddplot"),
    options = list(
      min = min,
      max = max,
      title = title,
      warningZone = warningZone,
      warningColor = warningColor,
      dangerZone = dangerZone,
      dangerColor = dangerColor,
      arcBgColor = arcBgColor,
      needleColor = needleColor,
      pivotColor = pivotColor,
      titleFontSize = titleFontSize,
      valueFontSize = valueFontSize,
      font = font,
      bgcol = bgcol,
      animate = animate,
      animationDuration = animationDuration
    ),
    width = width,
    height = height
  )
}
