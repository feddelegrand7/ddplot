#' Visualize Plant Growth Using D3
#'
#' This function creates a plant growth meter visualization.
#'
#' @param fill_level Numeric between 0 and 1 indicating growth level.
#' @param potWidth Width of the pot.
#' @param potHeight Height of the pot.
#' @param plantMaxHeight Max height of plant stem.
#' @param stemColor Color of the plant stem and leaves.
#' @param potColor Color of the pot.
#' @param flowerColor Color of the flowers that bloom when growth is high.
#' @param strokeColor Outline color for the pot.
#' @param strokeWidth Outline width.
#' @param renderFillLabel Whether to display a growth label.
#' @param titleText Title shown below the pot.
#' @param titleColor Title color.
#' @param titleFontSize Font size of the title.
#' @param font Font family.
#'
#' @export
plant_growth <- function(
    fill_level = 0.5,
    potWidth = 100,
    potHeight = 40,
    plantMaxHeight = 150,
    stemColor = "#228B22",
    potColor = "#8B4513",
    flowerColor = "#FF69B4",
    strokeColor = "#333",
    strokeWidth = 2,
    renderFillLabel = TRUE,
    titleText = "Plant Growth",
    titleColor = "#333",
    titleFontSize = "14px",
    font = "sans-serif"
) {

  if (fill_level > 1) {
    fill_level <- 1
  }

  r2d3::r2d3(
    data = fill_level,
    script = system.file("d3/scatterplot/plant_growth.js", package = "ddplot"),
    options = list(
      potWidth = potWidth,
      potHeight = potHeight,
      plantMaxHeight = plantMaxHeight,
      stemColor = stemColor,
      potColor = potColor,
      strokeColor = strokeColor,
      strokeWidth = strokeWidth,
      renderFillLabel = renderFillLabel,
      titleText = titleText,
      titleColor = titleColor,
      titleFontSize = titleFontSize,
      font = font
    )
  )
}
