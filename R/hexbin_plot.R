#' Create a hexbin plot.
#'
#' @description
#' A hexbin plot is a two-dimensional histogram: the x/y plane is tiled with
#' a grid of regular hexagons, every observation is assigned to the hexagon
#' it falls into, and each hexagon is colored by the number of observations
#' it contains. It is a readable alternative to a scatter plot when there
#' are too many points to see individually (overplotting), because dense
#' regions remain distinguishable instead of turning into a solid blob.
#'
#' The look is inspired by the \code{hexbin} transform of the Observable Plot
#' library: light gridlines, a sequential color scale with a continuous
#' legend, and an optional mode where the hexagon \emph{size} (area) also
#' encodes the count. Binning is done in pixel space, so the hexagons are
#' always regular regardless of the units of \code{x} and \code{y}.
#'
#' The plot is interactive: hovering a hexagon outlines it, marks its count
#' on the color legend and (when \code{tooltip = TRUE}) shows a tooltip with
#' the bin count, its share of all observations, and the x/y range covered
#' by the hexagon.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The name of the numeric column mapped to the horizontal axis.
#' @param y The name of the numeric column mapped to the vertical axis.
#' @param binWidth The radius of each hexagon in pixels (distance from its
#' center to a corner). Larger values give fewer, coarser bins. Defaults to
#' \code{12}.
#' @param sizeByCount Logical. When \code{TRUE}, the area of each hexagon is
#' also proportional to its count (the largest bin fills its cell), in
#' addition to the fill color. Defaults to \code{FALSE}.
#' @param colorPalette The name of a D3 sequential color interpolator,
#' without the \code{"interpolate"} prefix (e.g. \code{"Viridis"},
#' \code{"Blues"}, \code{"YlGnBu"}, \code{"Magma"}, \code{"Turbo"}).
#' Defaults to \code{"YlGnBu"}.
#' @param reverseColors Logical. Whether to reverse the direction of the
#' color palette. Defaults to \code{FALSE}.
#' @param colorScale How counts are mapped to colors: \code{"linear"}
#' (default), \code{"sqrt"} or \code{"log"}. Use \code{"sqrt"} or
#' \code{"log"} when a few very dense bins wash out the rest.
#' @param legend Logical. Whether to draw the continuous color legend.
#' Defaults to \code{TRUE}.
#' @param legendTitle Title of the color legend. Defaults to \code{"Count"}.
#' @param tooltip Logical. Whether to show a tooltip when a hexagon is
#' hovered. Defaults to \code{TRUE}.
#' @param hover Logical. When \code{TRUE} (default), hovering a hexagon
#' outlines it and marks its count on the legend.
#' @param animate Logical. When \code{TRUE} (default), hexagons grow into
#' place with a short staggered entry animation on first render.
#' @param opacity Fill opacity of the hexagons (0 to 1). Defaults to \code{1}.
#' @param stroke Stroke color of the hexagons. Defaults to \code{"white"}.
#' @param strokeWidth Stroke width of the hexagons in pixels. Defaults to
#' \code{0.5}.
#' @param grid Logical. Whether to draw light gridlines behind the hexagons.
#' Defaults to \code{TRUE}.
#' @param gridCol Color of the gridlines. Defaults to \code{"#e5e5e5"}.
#' @param xtitle Optional. Title of the x-axis. Defaults to the value of
#' \code{x}.
#' @param ytitle Optional. Title of the y-axis. Defaults to the value of
#' \code{y}.
#' @param xtitleFontSize Font size of the x-axis title. Defaults to \code{13}.
#' @param ytitleFontSize Font size of the y-axis title. Defaults to \code{13}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param xFontSize Font size of the x-axis tick labels. Defaults to \code{11}.
#' @param yFontSize Font size of the y-axis tick labels. Defaults to \code{11}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axisCol Color of axis lines, ticks, labels and titles. Defaults to
#' \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG hexbin plot.
#' @export
#'
#' @examples
#' # Old Faithful geyser: eruption duration vs waiting time
#' hexbin_plot(
#'   data     = faithful,
#'   x        = "waiting",
#'   y        = "eruptions",
#'   binWidth = 14,
#'   xtitle   = "Waiting time to next eruption (min)",
#'   ytitle   = "Eruption duration (min)",
#'   title    = "Old Faithful eruptions"
#' )
#'
#' # 10,000 diamonds: carat vs price, with a log color scale
#' library(ggplot2) # for the diamonds dataset
#' set.seed(1)
#' dsample <- diamonds[sample(nrow(diamonds), 10000), ]
#'
#' hexbin_plot(
#'   data         = dsample,
#'   x            = "carat",
#'   y            = "price",
#'   binWidth     = 8,
#'   colorPalette = "Viridis",
#'   colorScale   = "log",
#'   xtitle       = "Carat",
#'   ytitle       = "Price (USD)",
#'   title        = "Diamond price by carat"
#' )
#'
#' # Hexagon size encodes the count as well as the color
#' set.seed(42)
#' pts <- data.frame(
#'   a = c(rnorm(1500, 0, 1), rnorm(800, 3, 0.6)),
#'   b = c(rnorm(1500, 0, 1), rnorm(800, 2, 0.6))
#' )
#'
#' hexbin_plot(
#'   data         = pts,
#'   x            = "a",
#'   y            = "b",
#'   binWidth     = 13,
#'   sizeByCount  = TRUE,
#'   colorPalette = "Magma",
#'   reverseColors = TRUE,
#'   title        = "Two bivariate normal clusters"
#' )
hexbin_plot <- function(
    data,
    x,
    y,
    binWidth       = 12,
    sizeByCount    = FALSE,
    colorPalette   = "YlGnBu",
    reverseColors  = FALSE,
    colorScale     = c("linear", "sqrt", "log"),
    legend         = TRUE,
    legendTitle    = "Count",
    tooltip        = TRUE,
    hover          = TRUE,
    animate        = TRUE,
    opacity        = 1,
    stroke         = "white",
    strokeWidth    = 0.5,
    grid           = TRUE,
    gridCol        = "#e5e5e5",
    xtitle         = NULL,
    ytitle         = NULL,
    xtitleFontSize = 13,
    ytitleFontSize = 13,
    title          = NULL,
    titleFontSize  = 16,
    xFontSize      = 11,
    yFontSize      = 11,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    axisCol        = "black",
    width          = NULL,
    height         = NULL
) {

  if (!is.data.frame(data)) {
    stop("'data' must be a data frame.")
  }

  if (!is.character(x) || length(x) != 1) {
    stop("'x' must be a single column name.")
  }

  if (!is.character(y) || length(y) != 1) {
    stop("'y' must be a single column name.")
  }

  if (is.null(data[[x]])) stop("Column '", x, "' not found in data.")
  if (is.null(data[[y]])) stop("Column '", y, "' not found in data.")

  if (!is.numeric(data[[x]])) stop("Column '", x, "' must be numeric.")
  if (!is.numeric(data[[y]])) stop("Column '", y, "' must be numeric.")

  if (!is.numeric(binWidth) || length(binWidth) != 1 ||
      !is.finite(binWidth) || binWidth <= 0) {
    stop("'binWidth' must be a single positive number (hexagon radius in pixels).")
  }

  if (!is.character(colorPalette) || length(colorPalette) != 1) {
    stop("'colorPalette' must be a single D3 interpolator name, e.g. \"Viridis\" or \"Blues\".")
  }

  if (!is.numeric(opacity) || length(opacity) != 1 ||
      opacity < 0 || opacity > 1) {
    stop("'opacity' must be a single number between 0 and 1.")
  }

  colorScale <- match.arg(colorScale)

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(xtitle)) xtitle <- x
  if (is.null(ytitle)) ytitle <- y

  # Only the two plotted columns are sent to the browser; hexbin plots are
  # meant for large data, so shipping every column would bloat the widget.
  plot_data <- data.frame(
    x = as.numeric(data[[x]]),
    y = as.numeric(data[[y]])
  )
  plot_data <- plot_data[is.finite(plot_data$x) & is.finite(plot_data$y), ,
                         drop = FALSE]

  if (nrow(plot_data) == 0) {
    stop("No rows with finite values in both '", x, "' and '", y, "'.")
  }

  r2d3::r2d3(
    data   = plot_data,
    script = ddplot_script("hexbinplot.js"),
    options = list(
      xName          = x,
      yName          = y,
      binWidth       = binWidth,
      sizeByCount    = sizeByCount,
      colorPalette   = colorPalette,
      reverseColors  = reverseColors,
      colorScale     = colorScale,
      legend         = legend,
      legendTitle    = legendTitle,
      tooltip        = tooltip,
      hover          = hover,
      animate        = animate,
      opacity        = opacity,
      stroke         = stroke,
      strokeWidth    = strokeWidth,
      grid           = grid,
      gridCol        = gridCol,
      xtitle         = xtitle,
      ytitle         = ytitle,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      title          = title,
      titleFontSize  = titleFontSize,
      xFontSize      = xFontSize,
      yFontSize      = yFontSize,
      font           = font,
      bgcol          = bgcol,
      axisCol        = axisCol
    ),
    width  = width,
    height = height
  )
}
