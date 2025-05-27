#' Visualize a Glass Filling with Water using D3
#'
#' This function generates an SVG visualization of a glass filled with water to a specified level,
#' rendered via D3 using the `r2d3` package. The fill level, appearance of the glass, and label settings
#' can be customized.
#'
#' @param fill_level Numeric value between 0 and 1 indicating how full the glass should appear (e.g., 0.65 = 65% full).
#' @param glassWidth Width of the glass in pixels.
#' @param glassHeight Height of the glass in pixels.
#' @param strokeColor Color of the glass outline (stroke).
#' @param strokeWidth Width of the glass outline stroke.
#' @param fillColor Color used to fill the water in the glass.
#' @param renderFillLabel Logical indicating whether to display a percentage label above the glass.
#' @param labelFontSize Font size of the label, defaults to "16px"
#' @param labelColor Color of the label.
#' @param titleColor Color of the title text displayed below the glass.
#' @param titleFontSize Font size of the title text, defaults to "14px"
#' @param titleText Text to display as the title beneath the glass.
#'
#' @return An interactive D3 visualization rendered in the RStudio Viewer or web browser.
#' @examples
#' glass_fill(fill_level = 0.75)
#' glass_fill(fill_level = 0.3, fillColor = "lightblue", titleText = "Water Intake")
#'
#' @export
glass_fill <- function(
    fill_level = 0.65,
    glassWidth = 80,
    glassHeight = 200,
    strokeColor = "#555",
    strokeWidth = 3,
    fillColor = "skyblue",
    renderFillLabel = TRUE,
    labelFontSize = "16px",
    titleText = "Fill level",
    labelColor = "#333",
    titleColor = "#333",
    titleFontSize = "14px",
    font = "Verdana, Geneva, Tahoma, sans-serif"
) {
  r2d3::r2d3(
    data = fill_level,
    script = system.file("d3/scatterplot/glass_fill.js", package = "ddplot"),
    options = list(
      glassWidth = glassWidth,
      glassHeight = glassHeight,
      strokeColor = strokeColor,
      strokeWidth = strokeWidth,
      fillColor = fillColor,
      renderFillLabel = renderFillLabel,
      labelColor = labelColor,
      titleColor = titleColor,
      titleFontSize = titleFontSize,
      labelFontSize = labelFontSize,
      titleText = titleText,
      font = font
    )
  )
}
