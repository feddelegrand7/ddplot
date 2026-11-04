#' Create a violin plot.
#'
#' @description
#' A violin plot shows the distribution of a numeric variable for one or
#' several groups. Each group is drawn as a mirrored kernel density estimate
#' (the "violin"), so the width of the shape at a given value is proportional
#' to how many observations lie around it. Violin plots reveal features that
#' a box plot hides, such as multi-modality or skewness, while an inner box
#' plot keeps the familiar summary statistics in view. The look and feel is
#' inspired by the violin traces of the Plotly.js library.
#'
#' The kernel density estimates are computed in the browser with a Gaussian
#' kernel. By default each violin gets its own bandwidth, computed with
#' Silverman's rule of thumb (equivalent to \code{stats::bw.nrd0()}).
#'
#' The plot is interactive: hovering a violin dims the others, draws a
#' horizontal spike line at the cursor (with its value tagged on the y-axis)
#' and shows a tooltip with the group's summary statistics (n, min, q1,
#' median, q3, max and mean). Hovering a raw point shows its value.
#'
#' @param data The data frame containing the variables to consider.
#' @param y The name of the numeric column whose distribution is displayed.
#' @param group Optional. The name of a categorical column used to split the
#' data into one violin per group. When the column is a factor, its level
#' order is used (unless \code{sort} is set). Defaults to \code{NULL} (a
#' single violin).
#' @param bandwidth Optional. The kernel bandwidth, expressed as the standard
#' deviation of the Gaussian kernel (as in \code{stats::density()}), applied
#' to every violin. When \code{NULL} (default), each violin uses its own
#' bandwidth computed with Silverman's rule of thumb.
#' @param span How far the density extends. \code{"soft"} (default) extends
#' each violin two bandwidths beyond its minimum and maximum so the tails
#' fade out smoothly; \code{"hard"} cuts the violin at the observed minimum
#' and maximum.
#' @param scale How the violin widths are scaled. \code{"width"} (default)
#' gives every violin the same maximum width; \code{"count"} makes the width
#' proportional to the number of observations, so larger groups look larger.
#' @param box Logical. When \code{TRUE} (default), an inner box plot is drawn
#' inside each violin: a box from the first to the third quartile, a white
#' median line, and whiskers reaching the most extreme values within 1.5 IQR.
#' @param meanline Logical. When \code{TRUE}, a dashed line is drawn across
#' each violin at the mean. Defaults to \code{FALSE}.
#' @param points Which raw observations to draw on top of the violins:
#' \code{"outliers"} (default, values beyond the whiskers), \code{"all"}, or
#' \code{"none"}.
#' @param jitter Horizontal spread of the points, as a fraction (0 to 1) of
#' the violin's width at the point's value. Points therefore always stay
#' inside their violin. Defaults to \code{0.6}. Use \code{0} to align them
#' on the center line.
#' @param pointRadius Radius of the points in pixels. Defaults to \code{2.5}.
#' @param pointOpacity Fill opacity of the points (0 to 1). Defaults to
#' \code{0.7}.
#' @param sort How to order the violins from left to right. One of
#' \code{"none"} (default, factor level order or order of appearance),
#' \code{"mean"}, or \code{"median"} (ascending).
#' @param colorPalette The violin colors. Either the name of a D3 categorical
#' color scheme (e.g. \code{"Category10"}, the default, which is also
#' Plotly's classic colorway, \code{"Tableau10"}, \code{"Set2"}), a single
#' color applied to every violin, an unnamed vector of colors recycled over
#' the groups (in their original order), or a named vector whose names match
#' the group values.
#' @param fillOpacity Fill opacity of the violins (0 to 1). Defaults to
#' \code{0.5}.
#' @param lineWidth Width of the violin outline in pixels. Defaults to
#' \code{1.5}.
#' @param violinWidth Maximum width of a violin, as a fraction (0 to 1] of
#' the space allotted to each group. Defaults to \code{0.8}.
#' @param hover Logical. When \code{TRUE} (default), hovering a violin
#' highlights it and shows a tooltip with its summary statistics.
#' @param animate Logical. When \code{TRUE} (default), the violins grow from
#' their center line and the points fade in on first render.
#' @param ytitle Optional. Title of the y-axis.
#' @param ytitleFontSize Font size of the y-axis title. Defaults to \code{13}.
#' @param xtitle Optional. Title of the x-axis.
#' @param xtitleFontSize Font size of the x-axis title. Defaults to \code{13}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param xFontSize Font size of the group labels. Defaults to \code{11}.
#' Labels are rotated automatically when they do not fit.
#' @param yFontSize Font size of the y-axis tick labels. Defaults to \code{11}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axisCol Color of axis lines, ticks, and labels. Defaults to
#' \code{"black"}.
#' @param gridCol Color of the horizontal grid lines. Defaults to
#' \code{"#e6e6e6"}. Use \code{"none"} to hide them.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG violin plot.
#' @export
#'
#' @examples
#' # Sepal length by species, with the inner box plot and outliers
#' violin_plot(
#'   data   = iris,
#'   y      = "Sepal.Length",
#'   group  = "Species",
#'   title  = "Sepal length by species",
#'   ytitle = "Sepal length (cm)"
#' )
#'
#' # Every observation jittered inside its violin, plus a mean line
#' library(ggplot2) # for the mpg dataset
#'
#' violin_plot(
#'   data         = mpg,
#'   y            = "hwy",
#'   group        = "class",
#'   points       = "all",
#'   meanline     = TRUE,
#'   sort         = "median",
#'   colorPalette = "Tableau10",
#'   title        = "Highway fuel economy by vehicle class",
#'   ytitle       = "Highway miles per gallon"
#' )
#'
#' # A bimodal distribution, width proportional to group size, hard span
#' set.seed(2026)
#' waiting <- data.frame(
#'   minutes = c(rnorm(300, 55, 6), rnorm(200, 80, 5),
#'               rnorm(150, 70, 10), rnorm(60, 62, 4)),
#'   station = rep(c("North", "Central", "South"), c(500, 150, 60))
#' )
#'
#' violin_plot(
#'   data         = waiting,
#'   y            = "minutes",
#'   group        = "station",
#'   scale        = "count",
#'   span         = "hard",
#'   colorPalette = c(North = "#636efa", Central = "#ef553b",
#'                    South = "#00cc96"),
#'   title        = "Waiting time by station",
#'   ytitle       = "Minutes",
#'   xtitle       = "Station"
#' )
#'
#' # A single violin with a custom bandwidth
#' violin_plot(
#'   data         = faithful,
#'   y            = "eruptions",
#'   bandwidth    = 0.2,
#'   colorPalette = "#9467bd",
#'   points       = "all",
#'   ytitle       = "Eruption time (min)"
#' )
violin_plot <- function(
    data,
    y,
    group          = NULL,
    bandwidth      = NULL,
    span           = c("soft", "hard"),
    scale          = c("width", "count"),
    box            = TRUE,
    meanline       = FALSE,
    points         = c("outliers", "all", "none"),
    jitter         = 0.6,
    pointRadius    = 2.5,
    pointOpacity   = 0.7,
    sort           = c("none", "mean", "median"),
    colorPalette   = "Category10",
    fillOpacity    = 0.5,
    lineWidth      = 1.5,
    violinWidth    = 0.8,
    hover          = TRUE,
    animate        = TRUE,
    ytitle         = NULL,
    ytitleFontSize = 13,
    xtitle         = NULL,
    xtitleFontSize = 13,
    title          = NULL,
    titleFontSize  = 16,
    xFontSize      = 11,
    yFontSize      = 11,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    axisCol        = "black",
    gridCol        = "#e6e6e6",
    width          = NULL,
    height         = NULL
) {

  if (!is.data.frame(data)) {
    stop("'data' must be a data frame.")
  }

  if (!is.character(y) || length(y) != 1) {
    stop("'y' must be a single column name.")
  }

  if (is.null(data[[y]])) {
    stop("Column '", y, "' not found in data.")
  }

  if (!is.numeric(data[[y]])) {
    stop("Column '", y, "' must be numeric.")
  }

  if (!any(is.finite(data[[y]]))) {
    stop("Column '", y, "' has no finite values to plot.")
  }

  if (!is.null(group)) {
    if (!is.character(group) || length(group) != 1) {
      stop("'group' must be NULL or a single column name.")
    }
    if (is.null(data[[group]])) {
      stop("Column '", group, "' not found in data.")
    }
  }

  if (!is.null(bandwidth) &&
      (!is.numeric(bandwidth) || length(bandwidth) != 1 ||
       !is.finite(bandwidth) || bandwidth <= 0)) {
    stop("'bandwidth' must be NULL or a single positive number.")
  }

  check_flag <- function(v, name) {
    if (!is.logical(v) || length(v) != 1 || is.na(v)) {
      stop("'", name, "' must be TRUE or FALSE.")
    }
  }
  check_flag(box,      "box")
  check_flag(meanline, "meanline")
  check_flag(hover,    "hover")
  check_flag(animate,  "animate")

  check_unit <- function(v, name) {
    if (!is.numeric(v) || length(v) != 1 || !is.finite(v) || v < 0 || v > 1) {
      stop("'", name, "' must be a single number between 0 and 1.")
    }
  }
  check_unit(jitter,       "jitter")
  check_unit(pointOpacity, "pointOpacity")
  check_unit(fillOpacity,  "fillOpacity")

  if (!is.numeric(violinWidth) || length(violinWidth) != 1 ||
      !is.finite(violinWidth) || violinWidth <= 0 || violinWidth > 1) {
    stop("'violinWidth' must be a single number greater than 0 and at most 1.")
  }

  if (!is.numeric(pointRadius) || length(pointRadius) != 1 ||
      !is.finite(pointRadius) || pointRadius <= 0) {
    stop("'pointRadius' must be a single positive number.")
  }

  if (!is.numeric(lineWidth) || length(lineWidth) != 1 ||
      !is.finite(lineWidth) || lineWidth < 0) {
    stop("'lineWidth' must be a single non-negative number.")
  }

  span   <- match.arg(span)
  scale  <- match.arg(scale)
  points <- match.arg(points)
  sort   <- match.arg(sort)

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  # Group order: factor levels if available, otherwise order of appearance.
  # (Factor level order is lost when the data is serialized to JSON.)
  if (!is.null(group)) {
    grp_values <- data[[group]]
    if (is.factor(grp_values)) {
      group_levels <- levels(droplevels(grp_values))
    } else {
      group_levels <- unique(as.character(grp_values[!is.na(grp_values)]))
    }
  } else {
    group_levels <- character(0)
  }

  # Resolve 'colorPalette': a single string (D3 scheme name or one color) is
  # passed as is and resolved in JS; a vector becomes one color per group.
  if (!is.character(colorPalette) || length(colorPalette) == 0 ||
      anyNA(colorPalette)) {
    stop("'colorPalette' must be a D3 scheme name or a character vector of colors.")
  }
  if (length(colorPalette) > 1 || !is.null(names(colorPalette))) {
    if (!is.null(names(colorPalette))) {
      if (is.null(group)) {
        stop("'colorPalette' cannot be a named vector when 'group' is NULL.")
      }
      missing_grps <- setdiff(group_levels, names(colorPalette))
      if (length(missing_grps) > 0) {
        stop("'colorPalette' is a named vector but has no color for group(s): ",
             paste(missing_grps, collapse = ", "))
      }
      colorPalette <- unname(colorPalette[group_levels])
    } else if (!is.null(group)) {
      colorPalette <- rep_len(colorPalette, length(group_levels))
    }
    # Keep it a JSON array even with a single group
    colorPalette <- as.list(colorPalette)
  }

  # Only ship the columns the chart needs
  plot_data <- data[, unique(c(y, group)), drop = FALSE]

  r2d3::r2d3(
    data   = plot_data,
    script = ddplot_script("violinplot.js"),
    options = list(
      y              = y,
      group          = group,
      groupLevels    = as.list(group_levels),
      bandwidth      = bandwidth,
      span           = span,
      scale          = scale,
      box            = box,
      meanline       = meanline,
      points         = points,
      jitter         = jitter,
      pointRadius    = pointRadius,
      pointOpacity   = pointOpacity,
      sort           = sort,
      colorPalette   = colorPalette,
      fillOpacity    = fillOpacity,
      lineWidth      = lineWidth,
      violinWidth    = violinWidth,
      hover          = hover,
      animate        = animate,
      ytitle         = ytitle,
      ytitleFontSize = ytitleFontSize,
      xtitle         = xtitle,
      xtitleFontSize = xtitleFontSize,
      title          = title,
      titleFontSize  = titleFontSize,
      xFontSize      = xFontSize,
      yFontSize      = yFontSize,
      font           = font,
      bgcol          = bgcol,
      axisCol        = axisCol,
      gridCol        = gridCol
    ),
    width  = width,
    height = height
  )
}
