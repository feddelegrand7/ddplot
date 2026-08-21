#' Create a bullet chart.
#'
#' @description
#' A bullet chart displays a single quantitative measure (the actual value)
#' against qualitative range bands (e.g. poor / satisfactory / good) and an
#' optional target marker. It was designed by Stephen Few as a compact,
#' information-dense alternative to gauge charts.
#'
#' @param value Numeric. The actual value to display (the main bar).
#' @param ranges Numeric vector of upper bounds for each qualitative band,
#' in ascending order (e.g. \code{c(40, 70, 100)}). The lower bound of the
#' first band is \code{min}.
#' @param target Optional numeric. The target / goal value shown as a short
#' vertical marker. Defaults to \code{NULL} (no marker drawn).
#' @param rangeColors Character vector of colors for each band, in the same
#' order as \code{ranges}. Defaults to a sequence of grays from darker (low
#' range) to lighter (high range).
#' @param title Character. Label displayed to the left of the chart.
#' Defaults to \code{""}.
#' @param subtitle Character. Smaller label displayed below \code{title}.
#' Defaults to \code{""}.
#' @param min Numeric. The minimum value of the scale. Defaults to \code{0}.
#' @param valueColor The color of the actual-value bar. Defaults to
#' \code{"#1a1a2e"}.
#' @param targetColor The color of the target marker. Defaults to
#' \code{"#e63946"}.
#' @param tickCount Number of axis ticks. Defaults to \code{5}.
#' @param fontSize Base font size in pixels. Defaults to \code{12}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol The background color of the SVG. Defaults to \code{"white"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG bullet chart.
#' @importFrom grDevices grey
#' @export
#'
#' @examples
#' # Sales revenue vs target
#' bullet_chart(
#'   value  = 270,
#'   target = 300,
#'   ranges = c(150, 225, 350),
#'   title  = "Revenue",
#'   subtitle = "USD thousands"
#' )
#'
#' # Customer satisfaction score
#' bullet_chart(
#'   value  = 7.4,
#'   target = 8.0,
#'   ranges = c(4, 7, 10),
#'   title  = "Satisfaction",
#'   subtitle = "out of 10",
#'   valueColor = "steelblue"
#' )
#'
#' # Server response time (lower is better — ranges go poor → good left to right)
#' bullet_chart(
#'   value       = 320,
#'   target      = 250,
#'   ranges      = c(200, 500, 1000),
#'   rangeColors = c("#f5f5f5", "#e0e0e0", "#c0c0c0"),
#'   title       = "Response",
#'   subtitle    = "ms",
#'   min         = 0
#' )
bullet_chart <- function(
    value,
    ranges,
    target      = NULL,
    rangeColors = NULL,
    title       = "",
    subtitle    = "",
    min         = 0,
    valueColor  = "#1a1a2e",
    targetColor = "#e63946",
    tickCount   = 5,
    fontSize    = 12,
    font        = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol       = "white",
    width       = NULL,
    height      = NULL
) {

  if (!is.numeric(value) || length(value) != 1) {
    stop("'value' must be a single numeric value.")
  }

  if (!is.numeric(ranges) || length(ranges) < 1) {
    stop("'ranges' must be a non-empty numeric vector of upper bounds.")
  }

  if (is.unsorted(ranges)) {
    stop("'ranges' must be in ascending order.")
  }

  if (min >= ranges[1]) {
    stop("'min' must be less than the first element of 'ranges'.")
  }

  if (!is.null(rangeColors) && length(rangeColors) != length(ranges)) {
    stop("'rangeColors' must have the same length as 'ranges'.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(rangeColors)) {
    n <- length(ranges)
    rangeColors <- as.character(grey(seq(0.78, 0.94, length.out = n)))
  }

  r2d3::r2d3(
    data   = value,
    script = system.file("d3/scatterplot/bulletchart.js", package = "ddplot"),
    options = list(
      ranges      = ranges,
      target      = target,
      rangeColors = rangeColors,
      title       = title,
      subtitle    = subtitle,
      min         = min,
      valueColor  = valueColor,
      targetColor = targetColor,
      tickCount   = tickCount,
      fontSize    = fontSize,
      font        = font,
      bgcol       = bgcol
    ),
    width  = width,
    height = height
  )
}
