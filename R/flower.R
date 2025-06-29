#' Display a Rotating Flower Visualization
#'
#' @param petalCount The number of petals. Defaults to 6.
#' @param petalLength The length of each petal. Defaults to 100.
#' @param petalWidth The width of each petal. Defaults to 60.
#' @param petalColor The fill color of the petals. Defaults to "lightpink".
#' @param petalStroke The stroke color of the petals. Defaults to "deeppink".
#' @param centerRadius The radius of the flower's center circle. Defaults to 20.
#' @param centerColor The fill color of the center. Defaults to "gold".
#' @param centerStroke The stroke color of the center. Defaults to "darkorange".
#' @param centerText Optional. Text to display inside the center (e.g., a number or emoji).
#' @param centerTextSize The size of the center text. Defaults to 16.
#' @param centerTextColor The color of the center text. Defaults to "black".
#' @param font The font family for the center text. Defaults to "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the visualization. Defaults to "white".
#' @param rotationSpeed The speed of rotation (degrees per animation frame). Defaults to 2.
#' @param width The width of the SVG output. Optional.
#' @param height The height of the SVG output. Optional.
#'
#' @return An animated rotating flower SVG.
#' @export
#'
#' @examples
#' flower(
#'   petalCount = 5,
#'   petalColor = "plum",
#'   rotationSpeed = 1.5
#' )
flower <- function(
    petalCount = 6,
    petalLength = 100,
    petalWidth = 60,
    petalColor = "lightpink",
    petalStroke = "deeppink",
    centerRadius = 20,
    centerColor = "gold",
    centerStroke = "darkorange",
    centerText = NULL,
    centerTextSize = 16,
    centerTextColor = "black",
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol = "white",
    rotationSpeed = 2,
    width = NULL,
    height = NULL
) {
  if (grepl(";", font)) {
    stop("Please remove the ';' character from your font argument.")
  }

  r2d3::r2d3(
    data = NULL,
    script = system.file("d3/scatterplot/flower.js", package = "ddplot"),
    options = list(
      petalCount = petalCount,
      petalLength = petalLength,
      petalWidth = petalWidth,
      petalColor = petalColor,
      petalStroke = petalStroke,
      centerRadius = centerRadius,
      centerColor = centerColor,
      centerStroke = centerStroke,
      centerText = centerText,
      centerTextSize = centerTextSize,
      centerTextColor = centerTextColor,
      font = font,
      bgcol = bgcol,
      rotationSpeed = rotationSpeed,
      width = width,
      height = height
    )
  )
}
