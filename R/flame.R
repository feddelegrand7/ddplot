#' Display an Animated Flame Visualization
#'
#' Creates an animated flame SVG visualization whose size and color gradient
#' can be customized. The flame grows or shrinks based on the intensity parameter,
#' with smooth pulsing and wobbling animation.
#'
#' @param intensity Numeric value controlling the size of the flame. Values greater than 100
#'   cause the flame to grow beyond default scaling, while smaller values shrink it.
#'   Defaults to 50.
#' @param flameGradientColors A length-3 character vector specifying the colors of the flame gradient,
#'   from the center outward. Defaults to \code{c("white", "yellow", "darkred")}.
#' @param flameOutline Color string for the flame's outline stroke. Defaults to "darkred".
#' @param bgcol Background color of the SVG canvas. Defaults to "white".
#' @param width Optional width of the SVG output.
#' @param height Optional height of the SVG output.
#'
#' @return An \code{r2d3} object displaying the animated flame visualization.
#' @export
#'
#' @examples
#' flame(intensity = 5)
#' flame(intensity = 50, flameGradientColors = c("lightblue", "blue", "darkblue"), flameOutline = "navy")
flame <- function(
    intensity = 50,
    flameGradientColors = c("white", "yellow", "darkred"),
    flameOutline = "darkred",
    bgcol = "white",
    width = NULL,
    height = NULL
) {
  if (!length(flameGradientColors) == 3) {
    stop(
      "flameGradientColors must be a length-3 vector of colors"
    )
  }

  r2d3::r2d3(
    data = list(intensity = intensity),
    script = system.file("d3/scatterplot/flame.js", package = "ddplot"),
    options = list(
      flameColor0 = flameGradientColors[[1]],
      flameColor1 = flameGradientColors[[2]],
      flameColor2 = flameGradientColors[[3]],
      flameOutline = flameOutline,
      bgcol = bgcol,
      width = width,
      height = height
    )
  )
}
