#' Create a beeswarm plot.
#'
#' @description
#' A beeswarm plot displays individual data points along a numeric axis,
#' spreading them out so they do not overlap (like a swarm of bees). It is
#' a transparent alternative to box plots or violin plots because every
#' observation is visible. When a grouping variable is supplied, one swarm
#' is drawn per group along the opposite axis.
#'
#' The layout is computed with a D3 force simulation that pulls each point
#' toward its true value on the x-axis while resolving collisions so no
#' two circles overlap.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The name of the numeric column whose distribution is displayed.
#' @param group Optional. The name of a categorical column used to split
#' the data into separate swarms. Defaults to \code{NULL} (single swarm).
#' @param col Fill color of the points when no \code{group} is supplied.
#' Defaults to \code{"steelblue"}.
#' @param colorPalette D3 categorical color scheme used when \code{group}
#' is supplied (e.g. \code{"Tableau10"}, \code{"Category10"}, \code{"Set2"}).
#' Defaults to \code{"Tableau10"}.
#' @param radius Radius of each point in pixels. Defaults to \code{4}.
#' @param opacity Fill opacity of the points (0 to 1). Defaults to \code{0.75}.
#' @param stroke Stroke color of the points. Defaults to \code{"white"}.
#' @param strokeWidth Stroke width in pixels. Defaults to \code{0.5}.
#' @param xtitle Optional. Title of the x-axis.
#' @param xtitleFontSize Font size of the x-axis title. Defaults to \code{13}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param xFontSize Font size of the x-axis tick labels. Defaults to \code{11}.
#' @param yFontSize Font size of the y-axis group labels. Defaults to \code{11}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axisCol Color of axis lines, ticks, and labels. Defaults to
#' \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG beeswarm plot.
#' @export
#'
#' @examples
#' library(ggplot2) # for the mpg dataset
#'
#' # Single swarm — distribution of highway fuel economy
#' beeswarm_plot(
#'   data = mpg,
#'   x    = "hwy",
#'   col  = "steelblue",
#'   xtitle = "Highway miles per gallon",
#'   title  = "Distribution of hwy"
#' )
#'
#' # Grouped swarm — hwy by vehicle class
#' beeswarm_plot(
#'   data  = mpg,
#'   x     = "hwy",
#'   group = "class",
#'   xtitle = "Highway miles per gallon",
#'   title  = "Highway fuel economy by vehicle class"
#' )
#'
#' # Grouped swarm on the iris dataset
#' beeswarm_plot(
#'   data         = iris,
#'   x            = "Sepal.Length",
#'   group        = "Species",
#'   colorPalette = "Set2",
#'   radius       = 5,
#'   xtitle       = "Sepal length (cm)",
#'   title        = "Sepal length by species"
#' )
beeswarm_plot <- function(
    data,
    x,
    group        = NULL,
    col          = "steelblue",
    colorPalette = "Tableau10",
    radius       = 4,
    opacity      = 0.75,
    stroke       = "white",
    strokeWidth  = 0.5,
    xtitle       = NULL,
    xtitleFontSize = 13,
    title        = NULL,
    titleFontSize  = 16,
    xFontSize    = 11,
    yFontSize    = 11,
    font         = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol        = "white",
    axisCol      = "black",
    width        = NULL,
    height       = NULL
) {

  if (is.null(data[[x]])) {
    stop("Column '", x, "' not found in data.")
  }

  if (!is.numeric(data[[x]])) {
    stop("Column '", x, "' must be numeric.")
  }

  if (!is.null(group) && is.null(data[[group]])) {
    stop("Column '", group, "' not found in data.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data   = data,
    script = system.file("d3/scatterplot/beeswarmplot.js", package = "ddplot"),
    options = list(
      x            = x,
      group        = group,
      col          = col,
      colorPalette = colorPalette,
      radius       = radius,
      opacity      = opacity,
      stroke       = stroke,
      strokeWidth  = strokeWidth,
      xtitle       = xtitle,
      xtitleFontSize = xtitleFontSize,
      title        = title,
      titleFontSize  = titleFontSize,
      xFontSize    = xFontSize,
      yFontSize    = yFontSize,
      font         = font,
      bgcol        = bgcol,
      axisCol      = axisCol
    ),
    width  = width,
    height = height
  )
}
