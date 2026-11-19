#' Create a liquid fill gauge chart.
#'
#' @description
#' A liquid fill gauge represents a single value as a circle filled with an
#' animated liquid up to the corresponding level. The fill rises smoothly on
#' load, two wave layers give the water a natural depth, and the label text
#' changes color at the water surface — appearing in \code{text_color} above
#' the water and in \code{wave_text_color} below it.
#'
#' @param value Numeric. The fill level, between 0 and 1 (0 = empty, 1 = full).
#' @param label Character. Text displayed in the center of the gauge. Defaults
#' to \code{value} formatted as a percentage (e.g. \code{"55\%"}).
#' @param fill_color The color of the liquid. Defaults to \code{"steelblue"}.
#' @param circle_color The color of the outer ring. Defaults to
#' \code{fill_color}.
#' @param circle_thickness Thickness of the outer ring as a fraction of the
#' circle radius. Defaults to \code{0.05}.
#' @param text_color Color of the label text above the water surface. Defaults
#' to \code{fill_color}.
#' @param wave_text_color Color of the label text below (inside) the water
#' surface. Defaults to \code{"white"}.
#' @param text_size Font size of the label as a fraction of the circle radius.
#' Defaults to \code{0.38}.
#' @param wave_amplitude Height of the wave as a fraction of the circle radius.
#' Defaults to \code{0.09}.
#' @param wave_count Number of full wave cycles visible across the circle.
#' Defaults to \code{2}.
#' @param wave_speed Speed of the horizontal wave animation. Higher values are
#' faster. Defaults to \code{1}.
#' @param title Optional. A label displayed below the circle.
#' @param title_font_size Font size of the title in pixels. Defaults to \code{14}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bg_col Background color of the SVG. Defaults to \code{"white"}.
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
#'   fill_color = "#e67e22",
#'   title     = "Disk usage"
#' )
#'
#' # Low fill with a raw value label
#' liquid_chart(
#'   value         = 0.28,
#'   label         = "28%",
#'   fill_color     = "tomato",
#'   circle_color   = "tomato",
#'   text_color     = "tomato",
#'   wave_text_color = "white"
#' )
liquid_chart <- function(
    value,
    label         = NULL,
    fill_color     = "steelblue",
    circle_color   = NULL,
    circle_thickness = 0.05,
    text_color     = NULL,
    wave_text_color = "white",
    text_size      = 0.38,
    wave_amplitude = 0.09,
    wave_count     = 2,
    wave_speed     = 1,
    title         = NULL,
    title_font_size = 14,
    font          = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col         = "white",
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

  if (is.null(circle_color)) circle_color <- fill_color
  if (is.null(text_color))   text_color   <- fill_color

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data   = value,
    script = ddplot_script("liquidchart.js"),
    options = list(
      label           = label,
      fillColor       = fill_color,
      circleColor     = circle_color,
      circleThickness = circle_thickness,
      textColor       = text_color,
      waveTextColor   = wave_text_color,
      textSize        = text_size,
      waveAmplitude   = wave_amplitude,
      waveCount       = wave_count,
      waveSpeed       = wave_speed,
      title           = title,
      titleFontSize   = title_font_size,
      font            = font,
      bgcol           = bg_col
    ),
    width  = width,
    height = height
  )
}
