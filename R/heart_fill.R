#' Visualize a Heart Filling with Color using D3
#'
#' This function renders a heart-shaped SVG graphic that fills from the bottom up based on the provided level.
#' The appearance of the heart and accompanying label can be fully customized.
#'
#' @param fill_level Numeric value between 0 and 1 indicating how full the heart should appear (e.g., 0.8 = 80% full).
#' @param heartSize Numeric width/height scale for the heart shape in pixels.
#' @param strokeColor Color of the heart outline.
#' @param strokeWidth Width of the outline stroke.
#' @param fillColor Fill color of the heart (used to indicate level).
#' @param renderFillLabel Logical; if `TRUE`, a percentage label is shown above the heart.
#' @param labelColor Color of the percentage label text.
#' @param labelFontSize Font size of the percentage label text (e.g., `"16px"`).
#' @param font Font family for text.
#'
#' @return An interactive D3 heart fill visualization.
#' @examples
#' heart_fill(fill_level = 0.9)
#' heart_fill(fill_level = 0.4, fillColor = "pink", labelColor = "#C00", strokeColor = "#900")
#'
#' @export
heart_fill <- function(
    fill_level = 0.65,
    heartSize = 150,
    strokeColor = "#C00",
    strokeWidth = 4,
    fillColor = "red",
    renderFillLabel = TRUE,
    labelColor = "#333",
    labelFontSize = "16px",
    titleText = "Fill level",
    titleColor = "#333",
    titleFontSize = "14px",
    font = "Verdana, Geneva, Tahoma, sans-serif"
) {

  if (fill_level > 1) {
    fill_level <- 1
  }

  r2d3::r2d3(
    data = fill_level,
    script = system.file("d3/scatterplot/heart_fill.js", package = "ddplot"),
    options = list(
      heartSize = heartSize,
      strokeColor = strokeColor,
      strokeWidth = strokeWidth,
      fillColor = fillColor,
      renderFillLabel = renderFillLabel,
      labelColor = labelColor,
      labelFontSize = labelFontSize,
      titleText = titleText,
      titleColor = titleColor,
      titleFontSize = titleFontSize,
      font = font
    )
  )
}
