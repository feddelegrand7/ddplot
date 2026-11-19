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
#' The plot is interactive: hovering a point highlights it while dimming the
#' rest of the swarm, and (when \code{tooltip} columns are supplied) shows a
#' tooltip with those columns' values. When a \code{group} is supplied,
#' hovering a group label focuses that swarm and clicking a label toggles it
#' on or off. An optional mean/median reference line can be drawn per swarm.
#' The interactive behaviors are controlled by \code{tooltip}, \code{hover},
#' \code{animate}, and \code{stat}.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The name of the numeric column whose distribution is displayed.
#' @param group Optional. The name of a categorical column used to split
#' the data into separate swarms. Defaults to \code{NULL} (single swarm).
#' @param tooltip Optional. A column name, or a vector of column names, whose
#' values are shown in a tooltip when a point is hovered. Each column appears
#' on its own line as \code{"column: value"}. When \code{NULL} (default) no
#' tooltip is shown.
#' @param hover Logical. When \code{TRUE} (default), hovering a point
#' enlarges it and dims the rest of the swarm to make it stand out.
#' @param animate Logical. When \code{TRUE} (default), points grow into
#' place with a short staggered entry animation on first render.
#' @param stat Character. Draws a reference line per swarm at the
#' \code{"mean"} or \code{"median"} of the values. Defaults to
#' \code{"none"} (no line).
#' @param stat_color Color of the mean/median reference line and its label.
#' Defaults to \code{"#d62728"}.
#' @param col Fill color of the points when no \code{group} is supplied.
#' Defaults to \code{"steelblue"}.
#' @param color_palette D3 categorical color scheme used when \code{group}
#' is supplied (e.g. \code{"Tableau10"}, \code{"Category10"}, \code{"Set2"}).
#' Defaults to \code{"Tableau10"}.
#' @param radius Radius of each point in pixels. Defaults to \code{4}.
#' @param opacity Fill opacity of the points (0 to 1). Defaults to \code{0.75}.
#' @param stroke Stroke color of the points. Defaults to \code{"white"}.
#' @param stroke_width Stroke width in pixels. Defaults to \code{0.5}.
#' @param x_title Optional. Title of the x-axis.
#' @param x_title_font_size Font size of the x-axis title. Defaults to \code{13}.
#' @param title Optional. Title of the chart.
#' @param title_font_size Font size of the chart title. Defaults to \code{16}.
#' @param x_font_size Font size of the x-axis tick labels. Defaults to \code{11}.
#' @param y_font_size Font size of the y-axis group labels. Defaults to \code{11}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bg_col Background color of the SVG. Defaults to \code{"white"}.
#' @param axis_col Color of axis lines, ticks, and labels. Defaults to
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
#'   x_title = "Highway miles per gallon",
#'   title  = "Distribution of hwy"
#' )
#'
#' # Grouped swarm — hwy by vehicle class
#' beeswarm_plot(
#'   data  = mpg,
#'   x     = "hwy",
#'   group = "class",
#'   x_title = "Highway miles per gallon",
#'   title  = "Highway fuel economy by vehicle class"
#' )
#'
#' # Grouped swarm on the iris dataset
#' beeswarm_plot(
#'   data         = iris,
#'   x            = "Sepal.Length",
#'   group        = "Species",
#'   color_palette = "Set2",
#'   radius       = 5,
#'   x_title       = "Sepal length (cm)",
#'   title        = "Sepal length by species"
#' )
#'
#' # Interactive extras: median line per swarm and a tooltip label column
#' beeswarm_plot(
#'   data    = mpg,
#'   x       = "hwy",
#'   group   = "class",
#'   tooltip = "model",
#'   stat    = "median",
#'   x_title  = "Highway miles per gallon",
#'   title   = "Highway fuel economy by vehicle class"
#' )
beeswarm_plot <- function(
    data,
    x,
    group        = NULL,
    tooltip      = NULL,
    hover        = TRUE,
    animate      = TRUE,
    stat         = c("none", "mean", "median"),
    stat_color    = "#d62728",
    col          = "steelblue",
    color_palette = "Tableau10",
    radius       = 4,
    opacity      = 0.75,
    stroke       = "white",
    stroke_width  = 0.5,
    x_title       = NULL,
    x_title_font_size = 13,
    title        = NULL,
    title_font_size  = 16,
    x_font_size    = 11,
    y_font_size    = 11,
    font         = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col        = "white",
    axis_col      = "black",
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

  if (!is.null(tooltip)) {
    missing_cols <- setdiff(tooltip, names(data))
    if (length(missing_cols) > 0) {
      stop("Column(s) not found in data: ",
           paste(missing_cols, collapse = ", "))
    }
  }

  stat <- match.arg(stat)

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data   = data,
    script = ddplot_script("beeswarmplot.js"),
    options = list(
      x            = x,
      group        = group,
      tooltip      = tooltip,
      hover        = hover,
      animate      = animate,
      stat         = stat,
      statColor    = stat_color,
      col          = col,
      colorPalette = color_palette,
      radius       = radius,
      opacity      = opacity,
      stroke       = stroke,
      strokeWidth  = stroke_width,
      xtitle       = x_title,
      xtitleFontSize = x_title_font_size,
      title        = title,
      titleFontSize  = title_font_size,
      xFontSize    = x_font_size,
      yFontSize    = y_font_size,
      font         = font,
      bgcol        = bg_col,
      axisCol      = axis_col
    ),
    width  = width,
    height = height
  )
}
