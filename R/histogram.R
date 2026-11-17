#' Create an interactive histogram.
#'
#' Shows the distribution of a numeric variable as bars counting the
#' observations in bins of equal width. The bins are computed in the browser,
#' so their number can be changed from the chart. With \code{group}, the bars
#' are split by group, stacked or overlaid. A density curve, mean and median
#' lines, reference lines and a rug can be added, and a summary of the data
#' (number of observations, mean, median, standard deviation) is shown above
#' the bars.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover a bin to see its range, its count, its share of the total and
#'     the share of the observations below its upper edge; with \code{group},
#'     the tooltip lists every group.
#'   \item The buttons at the top right change the number of bins (− / +),
#'     switch between counts and percentages and, with \code{group}, between
#'     stacked and overlaid bars.
#'   \item Drag across the bars to select a range: the summary then describes
#'     the selected observations. "Zoom" re-bins the data within the range;
#'     double-click or "Reset zoom" goes back to the full range.
#'   \item Click a legend entry to hide or show a group, double-click it to
#'     isolate it.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a bin sets \code{input$id_clicked} to a list with \code{from},
#' \code{to}, \code{count} and \code{group}; selecting a range sets
#' \code{input$id_selected} to a list with \code{from}, \code{to} and
#' \code{count} (\code{NULL} when the selection is cleared). The number of
#' bins, the layout, the hidden groups and the zoom are kept when the chart is
#' re-rendered.
#'
#' @param x A numeric vector, or, when \code{data} is given, the name of a
#'   numeric column of \code{data}.
#' @param bins The approximate number of bins. The bins are given round
#'   widths (1, 2, 2.5 or 5 times a power of ten), so the actual number can
#'   differ slightly. Defaults to 30. Ignored when \code{binWidth} or
#'   \code{breaks} is given.
#' @param fill The colour of the bars. A single colour, or, with \code{group},
#'   one colour per group (a named vector maps colours to groups). Defaults to
#'   a built-in palette.
#' @param xFontSize The font size of the x-axis labels. Defaults to 11.
#' @param yFontSize The font size of the y-axis labels. Defaults to 11.
#' @param xticks Optional. The approximate number of x-axis ticks.
#' @param yticks Optional. The approximate number of y-axis ticks.
#' @param xtitle Optional. The title of the x-axis. Defaults to the name of
#'   the variable (when it can be found); use \code{""} to hide it.
#' @param xtitleFontSize The font size of the x-axis title. Defaults to 13.
#' @param ytitle Optional. The title of the y-axis, drawn above it. Defaults
#'   to "Count", "Percent" or "Density"; use \code{""} to hide it.
#' @param ytitleFontSize The font size of the y-axis title. Defaults to 13.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 20.
#' @param stroke Optional. The stroke colour of the bars.
#' @param strokeWidth Optional. The stroke width of the bars.
#' @param font The font family to consider for the titles. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param opacity The opacity of the bars (from 0 to 1). Defaults to 1, or
#'   0.5 for overlaid groups.
#' @param axisCol The colour of the axes, labels and titles. Defaults to
#'   "#333333".
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#' @param data Optional. A data frame; \code{x} and \code{group} are then
#'   column names.
#' @param group Optional. A vector of the same length as \code{x} (or, with
#'   \code{data}, the name of a column) splitting the observations into
#'   groups, with one colour per group and a clickable legend.
#' @param binWidth Optional. The width of the bins, in the units of \code{x}.
#' @param breaks Optional. A numeric vector of bin edges, for bins of unequal
#'   width (the bars are then scaled by density so their areas stay
#'   comparable). Values outside the edges are left out. The number of bins
#'   cannot be changed from the chart.
#' @param position How groups are drawn: \code{"stacked"} (default) or
#'   \code{"overlay"} (semi-transparent bars drawn on top of each other). It
#'   can be changed from the chart when \code{controls = TRUE}.
#' @param stat What the bar heights show: \code{"count"} (default),
#'   \code{"percent"} (share of the observations) or \code{"density"} (so
#'   that the areas of the bars add up to 1). Overlaid groups are each
#'   normalised by their own number of observations, so groups of different
#'   sizes can be compared.
#' @param density Add a density curve: \code{TRUE} or \code{"kde"} for a
#'   kernel density estimate (Gaussian kernel, bandwidth from
#'   \code{stats::bw.nrd0()}), \code{"normal"} for the normal distribution
#'   with the mean and standard deviation of the data. The curve is scaled to
#'   the bars. With overlaid groups, one curve is drawn per group. Defaults to
#'   \code{FALSE}.
#' @param stats Optional. Summary lines to draw across the bars: any of
#'   \code{"mean"} and \code{"median"} (\code{TRUE} draws both). With overlaid
#'   groups, one line is drawn per group.
#' @param refLines Optional. Numeric values drawn as dashed vertical lines
#'   (e.g. a threshold or a target); names are used as labels.
#' @param rug Logical. Draw a small tick under the bars for every observation
#'   (up to 5,000 observations). Defaults to \code{FALSE}.
#' @param summary Logical. Show the number of observations, the mean, the
#'   median and the standard deviation above the bars (or those of the
#'   selected range). Defaults to \code{TRUE}.
#' @param cornerRadius The radius of the rounded top corners of the bars, in
#'   pixels. Defaults to 2; use 0 for square bars.
#' @param legend Logical. Show the legend (with \code{group}). Defaults to
#'   \code{TRUE} when there is a group.
#' @param controls Logical. Show the buttons that change the bins, the
#'   counts / percentages and the layout. Defaults to \code{TRUE}.
#' @param tooltip Logical. Show a tooltip when hovering the bins. Defaults to
#'   \code{TRUE}.
#' @param animate Logical. Grow the bars when the chart is first drawn.
#'   Defaults to \code{TRUE}.
#' @param xFormat Optional. A D3 format string for the values of \code{x}
#'   (axis, tooltip and summary), such as \code{",.0f"} or \code{".1f"}.
#' @param xPrefix,xSuffix Optional. Text added before and after the values of
#'   \code{x}, such as \code{"$"} or \code{" km"}.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitleFontSize The font size of the subtitle. Defaults to 13.
#' @param gridCol The colour of the horizontal grid lines. Defaults to
#'   "#e9e9e9"; use \code{NA} to hide them.
#'
#' @return An interactive SVG histogram (an r2d3 htmlwidget).
#' @export
#' @examples
#' histogram(
#'   x = mtcars$mpg,
#'   bins = 10,
#'   title = "Fuel economy",
#'   xtitle = "Miles per gallon"
#' )
#'
#' library(ggplot2) # needed for the diamonds and mpg data frames
#'
#' # A long-tailed variable, with its density and summary lines
#' histogram(
#'   x = "price",
#'   data = diamonds,
#'   bins = 50,
#'   density = TRUE,
#'   stats = c("mean", "median"),
#'   xPrefix = "$",
#'   xFormat = ",.0f",
#'   title = "Diamond prices"
#' )
#'
#' # Groups compared on a percentage scale
#' histogram(
#'   x = "hwy",
#'   data = mpg,
#'   group = "drv",
#'   position = "overlay",
#'   stat = "percent",
#'   binWidth = 2,
#'   density = TRUE,
#'   title = "Highway fuel economy by drive train"
#' )
#'
histogram <- function(
  x,
  bins = 30,
  fill = NULL,
  xFontSize = 11,
  yFontSize = 11,
  xticks = NULL,
  yticks = NULL,
  xtitle = NULL,
  xtitleFontSize = 13,
  ytitle = NULL,
  ytitleFontSize = 13,
  title = NULL,
  titleFontSize = 20,
  stroke = NULL,
  strokeWidth = NULL,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "white",
  opacity = NULL,
  axisCol = "#333333",
  width = NULL,
  height = NULL,
  data = NULL,
  group = NULL,
  binWidth = NULL,
  breaks = NULL,
  position = c("stacked", "overlay"),
  stat = c("count", "percent", "density"),
  density = FALSE,
  stats = NULL,
  refLines = NULL,
  rug = FALSE,
  summary = TRUE,
  cornerRadius = 2,
  legend = NULL,
  controls = TRUE,
  tooltip = TRUE,
  animate = TRUE,
  xFormat = NULL,
  xPrefix = "",
  xSuffix = "",
  subtitle = NULL,
  subtitleFontSize = 13,
  gridCol = "#e9e9e9"
) {

  # the name of the variable, used as the default x-axis title
  x_name <- NULL
  if (is.null(data)) {
    ex <- substitute(x)
    if (is.name(ex)) {
      x_name <- as.character(ex)
    } else if (is.call(ex) && identical(ex[[1]], as.name("$")) && is.name(ex[[3]])) {
      x_name <- as.character(ex[[3]])
    }
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  position <- match.arg(position)
  stat <- match.arg(stat)

  # ---- values and groups ---------------------------------------------------------
  if (!is.null(data)) {
    if (!is.data.frame(data)) stop("'data' must be a data frame")
    if (!is.character(x) || length(x) != 1 || is.null(data[[x]])) {
      stop("with 'data', 'x' must be the name of a column of 'data'")
    }
    x_name <- x
    xv <- data[[x]]
    if (!is.null(group)) {
      if (!is.character(group) || length(group) != 1 || is.null(data[[group]])) {
        stop("'group' must be the name of a column of 'data'")
      }
      group_name <- group
      gv <- data[[group]]
    } else {
      group_name <- NULL
      gv <- NULL
    }
  } else {
    xv <- x
    gv <- group
    group_name <- if (is.null(group)) NULL else "Group"
    if (!is.null(gv) && length(gv) != length(xv)) {
      stop("'group' must have the same length as 'x'")
    }
  }
  if (is.data.frame(xv)) {
    stop("'x' is a data frame: pass it as 'data' and give the column name in 'x'")
  }
  if (!is.numeric(xv)) stop("'x' must be numeric")
  xv <- as.numeric(xv)

  if (!is.null(gv)) {
    if (is.factor(gv)) {
      lv <- levels(droplevels(gv))
      gv <- as.character(gv)
    } else {
      gv <- as.character(gv)
      lv <- sort(unique(gv[!is.na(gv)]))
    }
    if (anyNA(gv)) {
      gv[is.na(gv)] <- "(missing)"
      lv <- c(lv, "(missing)")
    }
  }
  keep <- is.finite(xv)
  n_missing <- sum(!keep)
  df <- data.frame(v = xv[keep], stringsAsFactors = FALSE)
  if (!is.null(gv)) df$g <- gv[keep]
  if (nrow(df) == 0) stop("'x' has no finite value to plot")
  groups <- if (is.null(gv)) NULL else lv[lv %in% df$g]

  # ---- arguments ---------------------------------------------------------------------
  if (!is.numeric(bins) || length(bins) != 1 || !is.finite(bins) || bins < 1) {
    stop("'bins' must be a single number, 1 or more")
  }
  if (!is.null(binWidth) && (!is.numeric(binWidth) || length(binWidth) != 1 || !(binWidth > 0))) {
    stop("'binWidth' must be a single positive number")
  }
  if (!is.null(breaks)) {
    if (!is.numeric(breaks) || length(breaks) < 2 || any(!is.finite(breaks))) {
      stop("'breaks' must be a numeric vector of at least two finite values")
    }
    breaks <- sort(unique(breaks))
    if (length(breaks) < 2) stop("'breaks' must contain at least two different values")
  }
  if (!is.null(opacity) && (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1)) {
    stop("'opacity' must be a number between 0 and 1")
  }
  if (isTRUE(density)) density <- "kde"
  if (isFALSE(density) || is.null(density)) density <- "none"
  if (!is.character(density) || length(density) != 1 || !density %in% c("none", "kde", "normal")) {
    stop("'density' must be TRUE, FALSE, \"kde\" or \"normal\"")
  }
  if (isTRUE(stats)) stats <- c("mean", "median")
  if (isFALSE(stats)) stats <- NULL
  if (!is.null(stats) && (!is.character(stats) || !all(stats %in% c("mean", "median")))) {
    stop("'stats' must be any of \"mean\" and \"median\"")
  }
  if (!is.null(refLines) && !is.numeric(refLines)) {
    stop("'refLines' must be a numeric vector")
  }
  ref_list <- NULL
  if (!is.null(refLines)) {
    lab <- if (is.null(names(refLines))) rep("", length(refLines)) else names(refLines)
    ref_list <- lapply(seq_along(refLines), function(k) list(value = unname(refLines[k]), label = lab[k]))
  }

  # ---- colours -------------------------------------------------------------------------
  palette <- c("#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
               "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0")
  bar_fill <- palette[1]
  group_colors <- NULL
  if (!is.null(groups)) {
    group_colors <- rep_len(palette, length(groups))
    if (!is.null(fill)) {
      if (!is.null(names(fill))) {
        m <- fill[groups]
        group_colors[!is.na(m)] <- m[!is.na(m)]
      } else if (length(fill) > 1) {
        group_colors <- rep_len(as.character(fill), length(groups))
      }
    }
    group_colors <- unname(as.character(group_colors))
  } else if (!is.null(fill)) {
    bar_fill <- as.character(fill)[1]
  }

  if (is.null(xtitle)) xtitle <- x_name
  if (is.null(legend)) legend <- !is.null(groups)

  r2d3::r2d3(
    data = df,
    script = ddplot_script("histogram.js"),
    options = list(
      stateKey = paste("hist", x_name, group_name, sep = "|"),
      groups = as.list(groups),
      groupName = group_name,
      fill = bar_fill,
      colors = as.list(group_colors),
      bins = bins,
      binWidth = binWidth,
      breaks = if (is.null(breaks)) NULL else as.list(breaks),
      position = position,
      stat = stat,
      density = density,
      stats = as.list(stats),
      refLines = ref_list,
      rug = isTRUE(rug),
      summary = isTRUE(summary),
      nMissing = n_missing,
      cornerRadius = cornerRadius,
      legend = isTRUE(legend),
      controls = isTRUE(controls),
      tooltip = isTRUE(tooltip),
      animate = isTRUE(animate),
      xFormat = xFormat,
      xPrefix = xPrefix,
      xSuffix = xSuffix,
      xticks = xticks,
      yticks = yticks,
      xtitle = xtitle,
      ytitle = ytitle,
      title = title,
      subtitle = subtitle,
      font = font,
      stroke = stroke,
      strokeWidth = strokeWidth,
      xFontSize = xFontSize,
      yFontSize = yFontSize,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      titleFontSize = titleFontSize,
      subtitleFontSize = subtitleFontSize,
      bgcol = bgcol,
      opacity = opacity,
      axisCol = axisCol,
      gridCol = if (is.null(gridCol) || is.na(gridCol)) NULL else gridCol,
      width = width,
      height = height
    )
  )
}
