#' Create a ridgeline plot (joy plot).
#'
#' @description
#' A ridgeline plot (also known as a "joy plot") shows the distribution of a
#' numeric variable for several groups as a stack of partially overlapping
#' density curves that share a common x-axis. The nickname comes from the
#' cover of Joy Division's 1979 album \emph{Unknown Pleasures}, itself a
#' reproduction of a 1970 plot of successive radio pulses from the first
#' discovered pulsar. The format was popularised by Claus Wilke's
#' \code{ggridges} package and by FiveThirtyEight and The Washington Post
#' graphics desks.
#'
#' Ridgeline plots are ideal for comparing the shape of many distributions
#' at once (e.g. across months, categories, or experimental conditions)
#' while using far less vertical space than a set of separate histograms.
#'
#' The kernel density estimates are computed in the browser. Ridges are drawn
#' from the back (top) to the front (bottom), so lower ridges overlap the
#' ones above them. Hovering a ridge (or its label) brings it to the front,
#' dims the others, and shows a small label with the group's number of
#' observations and mean.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The name of the numeric column whose distribution is displayed.
#' @param group The name of the categorical column used to split the data
#' into one ridge per group. When the column is a factor, its level order is
#' used (unless \code{sort} is set).
#' @param bandwidth Optional. The kernel bandwidth, expressed as the standard
#' deviation of the kernel (as in \code{stats::density()}). When \code{NULL}
#' (default), a single joint bandwidth is computed from the pooled data with
#' Silverman's rule of thumb (equivalent to \code{stats::bw.nrd0()}), so that
#' all ridges are smoothed identically and remain comparable.
#' @param kernel The smoothing kernel, either \code{"gaussian"} (default) or
#' \code{"epanechnikov"}.
#' @param overlap How much each ridge may overlap the one above it, in units
#' of the vertical distance between two consecutive baselines. The tallest
#' peak of the chart reaches exactly \code{overlap} baselines up. Defaults to
#' \code{1.5}; use \code{1} for ridges that just touch and larger values for
#' a more dramatic, Joy Division-like look.
#' @param fill Fill color of the ridges. Either a single color (default
#' \code{"steelblue"}) applied to every ridge, an unnamed vector of colors
#' recycled over the groups (in their original order), or a named vector
#' whose names match the group values.
#' @param fillOpacity Fill opacity of the ridges (0 to 1). Defaults to
#' \code{0.8}.
#' @param lineCol Color of the density outline. Defaults to \code{"#333333"}.
#' @param lineWidth Width of the density outline in pixels. Defaults to
#' \code{1}.
#' @param sort How to order the ridges from top to bottom. One of
#' \code{"none"} (default, factor level order or order of appearance),
#' \code{"mean"}, or \code{"median"}. When sorting, the group with the
#' smallest mean/median is placed at the top.
#' @param stat Character. Draws a vertical line inside each ridge at the
#' \code{"mean"} or \code{"median"} of its values. Defaults to \code{"none"}
#' (no line).
#' @param statColor Color of the mean/median line. Defaults to
#' \code{"#d62728"}.
#' @param hover Logical. When \code{TRUE} (default), hovering a ridge or its
#' label raises and highlights it and shows its number of observations and
#' mean.
#' @param xtitle Optional. Title of the x-axis.
#' @param xtitleFontSize Font size of the x-axis title. Defaults to \code{13}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param xFontSize Font size of the x-axis tick labels. Defaults to \code{11}.
#' @param yFontSize Font size of the group labels. Defaults to \code{11}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axisCol Color of axis lines, ticks, and labels. Defaults to
#' \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG ridgeline plot.
#' @export
#'
#' @examples
#' # Simulated reaction times for five experimental conditions
#' set.seed(2026)
#' reaction <- data.frame(
#'   time = c(rnorm(200, 300, 40), rnorm(200, 340, 50),
#'            rnorm(200, 380, 35), c(rnorm(100, 360, 25), rnorm(100, 460, 30)),
#'            rnorm(200, 420, 60)),
#'   condition = rep(c("Baseline", "Noise", "Fatigue", "Dual task", "Night"),
#'                   each = 200)
#' )
#'
#' ridgeline_plot(
#'   data   = reaction,
#'   x      = "time",
#'   group  = "condition",
#'   sort   = "mean",
#'   stat   = "median",
#'   title  = "Reaction time by condition",
#'   xtitle = "Reaction time (ms)"
#' )
#'
#' # Highway fuel economy by vehicle class
#' library(ggplot2) # for the mpg dataset
#'
#' ridgeline_plot(
#'   data        = mpg,
#'   x           = "hwy",
#'   group       = "class",
#'   sort        = "median",
#'   fill        = "#2c7fb8",
#'   lineCol     = "white",
#'   fillOpacity = 0.9,
#'   overlap     = 2,
#'   title       = "Highway fuel economy by vehicle class",
#'   xtitle      = "Highway miles per gallon"
#' )
#'
#' # One color per group with a named vector, Epanechnikov kernel
#' ridgeline_plot(
#'   data    = iris,
#'   x       = "Petal.Length",
#'   group   = "Species",
#'   kernel  = "epanechnikov",
#'   fill    = c(setosa = "#66c2a5", versicolor = "#fc8d62",
#'               virginica = "#8da0cb"),
#'   overlap = 1,
#'   stat    = "mean",
#'   xtitle  = "Petal length (cm)"
#' )
ridgeline_plot <- function(
    data,
    x,
    group,
    bandwidth    = NULL,
    kernel       = c("gaussian", "epanechnikov"),
    overlap      = 1.5,
    fill         = "steelblue",
    fillOpacity  = 0.8,
    lineCol      = "#333333",
    lineWidth    = 1,
    sort         = c("none", "mean", "median"),
    stat         = c("none", "mean", "median"),
    statColor    = "#d62728",
    hover        = TRUE,
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

  if (is.null(data[[group]])) {
    stop("Column '", group, "' not found in data.")
  }

  if (!is.null(bandwidth) &&
      (!is.numeric(bandwidth) || length(bandwidth) != 1 ||
       !is.finite(bandwidth) || bandwidth <= 0)) {
    stop("'bandwidth' must be NULL or a single positive number.")
  }

  if (!is.numeric(overlap) || length(overlap) != 1 ||
      !is.finite(overlap) || overlap <= 0) {
    stop("'overlap' must be a single positive number.")
  }

  if (!is.numeric(fillOpacity) || length(fillOpacity) != 1 ||
      fillOpacity < 0 || fillOpacity > 1) {
    stop("'fillOpacity' must be a single number between 0 and 1.")
  }

  kernel <- match.arg(kernel)
  sort   <- match.arg(sort)
  stat   <- match.arg(stat)

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  # Group order: factor levels if available, otherwise order of appearance.
  # (Factor level order is lost when the data is serialized to JSON.)
  grp_values <- data[[group]]
  if (is.factor(grp_values)) {
    group_levels <- levels(droplevels(grp_values))
  } else {
    group_levels <- unique(as.character(grp_values[!is.na(grp_values)]))
  }

  # Resolve 'fill' to one color per group (aligned with group_levels)
  if (!is.character(fill) || length(fill) == 0) {
    stop("'fill' must be a character vector of colors.")
  }
  if (length(fill) > 1 || !is.null(names(fill))) {
    if (!is.null(names(fill))) {
      missing_grps <- setdiff(group_levels, names(fill))
      if (length(missing_grps) > 0) {
        stop("'fill' is a named vector but has no color for group(s): ",
             paste(missing_grps, collapse = ", "))
      }
      fill <- unname(fill[group_levels])
    } else {
      fill <- rep_len(fill, length(group_levels))
    }
    # Keep it a JSON array even with a single group
    fill <- as.list(fill)
  }

  r2d3::r2d3(
    data   = data,
    script = ddplot_script("ridgelineplot.js"),
    options = list(
      x            = x,
      group        = group,
      groupLevels  = as.list(group_levels),
      bandwidth    = bandwidth,
      kernel       = kernel,
      overlap      = overlap,
      fill         = fill,
      fillOpacity  = fillOpacity,
      lineCol      = lineCol,
      lineWidth    = lineWidth,
      sort         = sort,
      stat         = stat,
      statColor    = statColor,
      hover        = hover,
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
