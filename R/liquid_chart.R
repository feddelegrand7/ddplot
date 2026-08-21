#' Create a liquid fill gauge chart.
#'
#' @description
#' A liquid fill gauge represents a single value as a circle filled with an
#' animated liquid up to the corresponding level. The fill rises smoothly on
#' load, two wave layers give the water a natural depth, and the label text
#' changes color at the water surface — appearing in \code{textColor} above
#' the water and in \code{waveTextColor} below it.
#'
#' @param value Numeric. The fill level, between 0 and 1 (0 = empty, 1 = full).
#' @param label Character. Text displayed in the center of the gauge. Defaults
#' to \code{value} formatted as a percentage (e.g. \code{"55\%"}).
#' @param fillColor The color of the liquid. Defaults to \code{"steelblue"}.
#' @param circleColor The color of the outer ring. Defaults to
#' \code{fillColor}.
#' @param circleThickness Thickness of the outer ring as a fraction of the
#' circle radius. Defaults to \code{0.05}.
#' @param textColor Color of the label text above the water surface. Defaults
#' to \code{fillColor}.
#' @param waveTextColor Color of the label text below (inside) the water
#' surface. Defaults to \code{"white"}.
#' @param textSize Font size of the label as a fraction of the circle radius.
#' Defaults to \code{0.38}.
#' @param waveAmplitude Height of the wave as a fraction of the circle radius.
#' Defaults to \code{0.09}.
#' @param waveCount Number of full wave cycles visible across the circle.
#' Defaults to \code{2}.
#' @param waveSpeed Speed of the horizontal wave animation. Higher values are
#' faster. Defaults to \code{1}.
#' @param title Optional. A label displayed below the circle.
#' @param titleFontSize Font size of the title in pixels. Defaults to \code{14}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An animated SVG liquid fill gauge.
#' @export
#'
#' @examples
#' # Basic usage — 55% fill
#' liquid_chart(value = 0.55)
#'
#' # Custom color and label
#' liquid_chart(
#'   value     = 0.72,
#'   label     = "72%",
#'   fillColor = "#e67e22",
#'   title     = "Disk usage"
#' )
#'
#' # Low fill with a raw value label
#' liquid_chart(
#'   value         = 0.28,
#'   label         = "28%",
#'   fillColor     = "tomato",
#'   circleColor   = "tomato",
#'   textColor     = "tomato",
#'   waveTextColor = "white"
#' )
liquid_chart <- function(
    value,
    label         = NULL,
    fillColor     = "steelblue",
    circleColor   = NULL,
    circleThickness = 0.05,
    textColor     = NULL,
    waveTextColor = "white",
    textSize      = 0.38,
    waveAmplitude = 0.09,
    waveCount     = 2,
    waveSpeed     = 1,
    title         = NULL,
    titleFontSize = 14,
    font          = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol         = "white",
    width         = NULL,
    height        = NULL
) {

  if (!is.numeric(value) || length(value) != 1) {
    stop("'value' must be a single numeric value between 0 and 1.")
  }

  value <- min(max(value, 0), 1)

  if (is.null(label)) {
    label <- paste0(round(value * 100, 1), "%")
  }

  if (is.null(circleColor)) circleColor <- fillColor
  if (is.null(textColor))   textColor   <- fillColor

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data   = value,
    script = system.file("d3/scatterplot/liquidchart.js", package = "ddplot"),
    options = list(
      label           = label,
      fillColor       = fillColor,
      circleColor     = circleColor,
      circleThickness = circleThickness,
      textColor       = textColor,
      waveTextColor   = waveTextColor,
      textSize        = textSize,
      waveAmplitude   = waveAmplitude,
      waveCount       = waveCount,
      waveSpeed       = waveSpeed,
      title           = title,
      titleFontSize   = titleFontSize,
      font            = font,
      bgcol           = bgcol
    ),
    width  = width,
    height = height
  )
}
