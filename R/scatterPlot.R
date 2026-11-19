
#' Create an interactive scatter plot.
#'
#' Plots two numeric variables against each other. Points can be coloured by
#' a group (categorical or continuous), sized by a third variable (bubble
#' chart), labelled, and summarised with a linear or LOESS trend line and its
#' confidence band. The chart is interactive: hovering a point shows its
#' values, the legend hides or isolates groups, and dragging a box selects
#' points, which can then be zoomed into.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover a point to see its values; hover a trend line to see the fit
#'     (slope, intercept and R-squared for \code{trend = "lm"}).
#'   \item Click a legend entry to hide or show a group, double-click it to
#'     isolate it. Hovering a legend entry highlights the group.
#'   \item Drag on the chart to select points (when \code{brush = TRUE}). The
#'     toolbar then offers \emph{Zoom} and \emph{Clear}. Double-click the chart
#'     to reset the zoom.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' the chart sets two inputs: \code{input$id_selected}, the row numbers of
#' \code{data} inside the brushed box (\code{NULL} when the selection is
#' cleared), and \code{input$id_clicked}, the row number of the last clicked
#' point. Hidden groups and the zoom are kept when the chart is re-rendered
#' with the same \code{x} and \code{y}.
#'
#' @param data The data frame containing the variables.
#' @param x The name of the numeric x-variable.
#' @param y The name of the numeric y-variable.
#' @param col Colour of the points. A single colour when there is no
#'   \code{group}. With a categorical \code{group}, a vector of colours
#'   (recycled; a named vector maps colours to groups). With a numeric
#'   \code{group}, two colours or more define the gradient. Defaults to a
#'   built-in palette (viridis for a numeric \code{group}).
#' @param size The radius of the points in pixels when \code{size_by} is not
#'   used. Defaults to 4.
#' @param x_ticks Optional. The approximate number of x-axis ticks.
#' @param y_ticks Optional. The approximate number of y-axis ticks.
#' @param x_title Optional. The title of the x-axis. Defaults to the name of
#'   \code{x}; use \code{""} to hide it.
#' @param x_title_font_size The font size of the x-axis title. Defaults to 13.
#' @param y_title Optional. The title of the y-axis, drawn above the axis.
#'   Defaults to the name of \code{y}; use \code{""} to hide it.
#' @param y_title_font_size The font size of the y-axis title. Defaults to 13.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 20.
#' @param stroke Optional. The stroke colour of the points. Defaults to the
#'   background colour, which separates overlapping points.
#' @param stroke_width Optional. The stroke width of the points.
#' @param font The font family to consider for the titles. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bg_col The background color of the SVG. Defaults to "white".
#' @param opacity The opacity of the points (from 0 to 1). Defaults to 0.8.
#' @param axis_col The colour of the axes, labels and titles. Defaults to
#'   "#333333".
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#' @param group Optional. The name of a column used to colour the points. A
#'   character, factor or logical column gives one colour per group and a
#'   clickable legend; a numeric column gives a colour gradient. Use
#'   \code{as.factor()} to treat a numeric column as categories.
#' @param size_by Optional. The name of a numeric column mapped to the point
#'   area (bubble chart).
#' @param size_range The minimum and maximum radius in pixels used with
#'   \code{size_by}. Defaults to \code{c(3, 16)}.
#' @param label Optional. The name of a column identifying each point. It is
#'   used as the tooltip title and by \code{show_labels}.
#' @param show_labels Optional. Draws text labels next to points:
#'   \code{TRUE} labels every point, a character vector labels the points
#'   whose \code{label} matches. Requires \code{label}.
#' @param tooltip \code{TRUE} (default) shows a tooltip on hover,
#'   \code{FALSE} disables it. A character vector of column names adds those
#'   columns to the tooltip.
#' @param trend Adds a trend line: \code{"none"} (default), \code{"lm"}
#'   (linear regression) or \code{"loess"}. With a categorical \code{group},
#'   one line is fitted per group. With a log scale, the fit is computed on
#'   the log values.
#' @param ci Logical. Draw the 95\% confidence band around the trend line.
#'   Defaults to \code{TRUE}.
#' @param span The LOESS smoothing parameter. Defaults to 0.75.
#' @param x_scale The x-axis scale: \code{"linear"} (default) or \code{"log"}.
#'   Rows with non-positive values are dropped with a log scale.
#' @param y_scale The y-axis scale: \code{"linear"} (default) or \code{"log"}.
#' @param h_lines Optional. Numeric values drawn as horizontal dashed
#'   reference lines; names are used as labels.
#' @param v_lines Optional. Numeric values drawn as vertical dashed reference
#'   lines; names are used as labels.
#' @param legend Logical. Show the legend. When \code{NULL} (default), it is
#'   shown when \code{group} or \code{size_by} is used.
#' @param brush Logical. Enable drag-to-select and zoom. Defaults to
#'   \code{TRUE}.
#' @param animate Logical. Animate the points when the chart is first drawn.
#'   Defaults to \code{TRUE}.
#' @param x_format,y_format Optional. d3-format strings for the axes and the
#'   tooltip, e.g. \code{",.0f"}, \code{".1\%"} or \code{"$,.2f"}.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param grid_col The colour of the grid lines. Defaults to "#e9e9e9"; use
#'   \code{NA} to hide them.
#'
#' @return An interactive SVG scatter plot (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#'
#' scatter_plot(
#'   data = mtcars,
#'   x = "wt",
#'   y = "mpg"
#' )
#'
#' # Colour by group, one linear fit per group
#' scatter_plot(
#'   data = iris,
#'   x = "Sepal.Length",
#'   y = "Petal.Length",
#'   group = "Species",
#'   trend = "lm",
#'   title = "Petal and sepal length"
#' )
#'
#' # Bubble chart with a continuous colour scale, labels and extra tooltip rows
#' cars <- mtcars
#' cars$model <- rownames(mtcars)
#' scatter_plot(
#'   data = cars,
#'   x = "hp",
#'   y = "mpg",
#'   size_by = "disp",
#'   group = "qsec",
#'   label = "model",
#'   show_labels = c("Maserati Bora", "Toyota Corolla", "Lotus Europa"),
#'   tooltip = c("cyl", "gear"),
#'   trend = "loess",
#'   title = "Horsepower and fuel economy",
#'   subtitle = "Bubble area: displacement; colour: quarter-mile time"
#' )
#'
#' # Log scales and reference lines
#' scatter_plot(
#'   data = data.frame(area = state.x77[, "Area"],
#'                     population = state.x77[, "Population"],
#'                     state = rownames(state.x77)),
#'   x = "area",
#'   y = "population",
#'   label = "state",
#'   x_scale = "log",
#'   y_scale = "log",
#'   h_lines = c("Median" = 2838.5)
#' )
#'
scatter_plot <- function(
                        data,
                        x,
                        y,
                        col = NULL,
                        size = 4,
                        x_ticks = NULL,
                        y_ticks = NULL,
                        x_title = NULL,
                        x_title_font_size = 13,
                        y_title = NULL,
                        y_title_font_size = 13,
                        title = NULL,
                        title_font_size = 20,
                        stroke = NULL,
                        stroke_width = NULL,
                        font = "Verdana, Geneva, Tahoma, sans-serif",
                        bg_col = "white",
                        opacity = 0.8,
                        axis_col = "#333333",
                        width = NULL,
                        height = NULL,
                        group = NULL,
                        size_by = NULL,
                        size_range = c(3, 16),
                        label = NULL,
                        show_labels = NULL,
                        tooltip = TRUE,
                        trend = c("none", "lm", "loess"),
                        ci = TRUE,
                        span = 0.75,
                        x_scale = c("linear", "log"),
                        y_scale = c("linear", "log"),
                        h_lines = NULL,
                        v_lines = NULL,
                        legend = NULL,
                        brush = TRUE,
                        animate = TRUE,
                        x_format = NULL,
                        y_format = NULL,
                        subtitle = NULL,
                        subtitle_font_size = 13,
                        grid_col = "#e9e9e9"
                        ) {

  trend <- match.arg(trend)
  x_scale <- match.arg(x_scale)
  y_scale <- match.arg(y_scale)

  if (!is.data.frame(data)) {
    stop("'data' must be a data frame")
  }
  if (!is.character(x) || !is.character(y) || length(x) != 1 || length(y) != 1 ||
      is.null(data[[x]]) || is.null(data[[y]])) {
    stop("Please check that x and y belong to the specified data frame")
  }
  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  check_column <- function(nm, what) {
    if (!is.null(nm) && (!is.character(nm) || length(nm) != 1 || is.null(data[[nm]]))) {
      stop("'", what, "' must be the name of a column of 'data'")
    }
  }
  check_column(group, "group")
  check_column(size_by, "size_by")
  check_column(label, "label")

  xv <- data[[x]]
  yv <- data[[y]]
  if (!is.numeric(xv) || !is.numeric(yv)) {
    stop("'x' and 'y' must be numeric columns")
  }
  if (!is.numeric(size) || length(size) != 1 || size <= 0) {
    stop("'size' must be a positive number")
  }
  if (!is.numeric(size_range) || length(size_range) != 2 || any(size_range <= 0)) {
    stop("'size_range' must be two positive numbers")
  }
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a number between 0 and 1")
  }
  if (!is.null(show_labels) && is.null(label)) {
    stop("'show_labels' requires 'label'")
  }

  n <- nrow(data)
  keep <- is.finite(xv) & is.finite(yv)

  if (x_scale == "log" && any(keep & xv <= 0)) {
    warning("Rows with x <= 0 are dropped with x_scale = \"log\"")
    keep <- keep & xv > 0
  }
  if (y_scale == "log" && any(keep & yv <= 0)) {
    warning("Rows with y <= 0 are dropped with y_scale = \"log\"")
    keep <- keep & yv > 0
  }

  pts <- data.frame(x = as.numeric(xv), y = as.numeric(yv), i = seq_len(n))

  # ---- colour ----------------------------------------------------------------
  palette <- c("#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
               "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0")
  group_type <- "none"
  levels <- NULL
  colors <- NULL

  if (!is.null(group)) {
    gv <- data[[group]]
    if (is.numeric(gv)) {
      group_type <- "continuous"
      pts$g <- ifelse(is.finite(gv), gv, NA)
      if (!is.null(col)) {
        if (length(col) < 2) stop("with a numeric 'group', 'col' must have two colours or more")
        colors <- unname(as.character(col))
      }
    } else {
      group_type <- "categorical"
      if (is.factor(gv)) {
        levels <- levels(droplevels(gv[keep]))
        gv <- as.character(gv)
      } else {
        gv <- as.character(gv)
        levels <- sort(unique(gv[keep & !is.na(gv)]))
      }
      if (any(is.na(gv[keep]))) {
        gv[is.na(gv)] <- "(missing)"
        levels <- c(levels, "(missing)")
      }
      pts$g <- gv
      colors <- rep_len(palette, length(levels))
      if (!is.null(col)) {
        if (!is.null(names(col))) {
          matched <- col[levels]
          colors[!is.na(matched)] <- matched[!is.na(matched)]
        } else {
          colors <- rep_len(as.character(col), length(levels))
        }
      }
      colors <- unname(colors)
    }
  }

  point_col <- if (is.null(col) || group_type != "none") palette[1] else as.character(col)[1]

  # ---- size, label, tooltip --------------------------------------------------
  if (!is.null(size_by)) {
    sv <- data[[size_by]]
    if (!is.numeric(sv)) stop("'size_by' must be a numeric column")
    pts$s <- ifelse(is.finite(sv), sv, NA)
  }

  if (!is.null(label)) {
    pts$l <- as.character(data[[label]])
    if (isTRUE(show_labels)) {
      pts$a <- TRUE
    } else if (is.character(show_labels)) {
      pts$a <- pts$l %in% show_labels
    } else if (!is.null(show_labels) && !isFALSE(show_labels)) {
      stop("'show_labels' must be TRUE, FALSE or a character vector of labels")
    }
  }

  tooltip_on <- !isFALSE(tooltip)
  tip_names <- NULL
  if (is.character(tooltip)) {
    missing_cols <- setdiff(tooltip, names(data))
    if (length(missing_cols)) {
      stop("'tooltip' columns not found in 'data': ", paste(missing_cols, collapse = ", "))
    }
    tip_names <- tooltip
    for (k in seq_along(tooltip)) {
      v <- data[[tooltip[k]]]
      pts[[paste0("t", k - 1)]] <- if (is.numeric(v)) {
        ifelse(is.finite(v), v, NA)
      } else {
        ifelse(is.na(v), "", as.character(v))
      }
    }
  } else if (!is.logical(tooltip) || length(tooltip) != 1) {
    stop("'tooltip' must be TRUE, FALSE or a character vector of column names")
  }

  pts <- pts[keep, , drop = FALSE]

  # ---- trend lines -----------------------------------------------------------
  trends <- NULL
  if (trend != "none" && nrow(pts) > 0) {
    if (group_type == "categorical") {
      trends <- lapply(levels, function(lv) {
        sub <- pts[pts$g == lv, , drop = FALSE]
        fit_scatter_trend(sub$x, sub$y, trend, ci, span,
                          x_scale == "log", y_scale == "log", lv)
      })
    } else {
      trends <- list(fit_scatter_trend(pts$x, pts$y, trend, ci, span,
                                       x_scale == "log", y_scale == "log", NULL))
    }
    trends <- Filter(Negate(is.null), trends)
    if (length(trends) == 0) trends <- NULL
  }

  # ---- reference lines -------------------------------------------------------
  ref_lines <- function(v, what) {
    if (is.null(v)) return(NULL)
    if (!is.numeric(v)) stop("'", what, "' must be a numeric vector")
    lab <- if (is.null(names(v))) rep("", length(v)) else names(v)
    lapply(seq_along(v), function(k) list(value = unname(v[k]), label = lab[k]))
  }

  if (is.null(legend)) legend <- group_type != "none" || !is.null(size_by)

  r2d3::r2d3(
    data = pts,
    script = ddplot_script("scatterplot.js"),
    options = list(
      x = x,
      y = y,
      col = point_col,
      size = size,
      groupType = group_type,
      group = group,
      levels = as.list(levels),
      colors = as.list(colors),
      sizeBy = size_by,
      sizeRange = size_range,
      label = label,
      tooltip = tooltip_on,
      tipNames = as.list(tip_names),
      trend = trend,
      trends = trends,
      span = span,
      xScale = x_scale,
      yScale = y_scale,
      hlines = ref_lines(h_lines, "h_lines"),
      vlines = ref_lines(v_lines, "v_lines"),
      legend = isTRUE(legend),
      brush = isTRUE(brush),
      animate = isTRUE(animate),
      xFormat = x_format,
      yFormat = y_format,
      xticks = x_ticks,
      yticks = y_ticks,
      xtitle = if (is.null(x_title)) x else x_title,
      ytitle = if (is.null(y_title)) y else y_title,
      title = title,
      subtitle = subtitle,
      font = font,
      stroke = stroke,
      strokeWidth = stroke_width,
      width = width,
      height = height,
      xtitleFontSize = x_title_font_size,
      ytitleFontSize = y_title_font_size,
      titleFontSize = title_font_size,
      subtitleFontSize = subtitle_font_size,
      bgcol = bg_col,
      gridCol = if (is.null(grid_col) || is.na(grid_col)) NULL else grid_col,
      opacity = opacity,
      axisCol = axis_col
    )
  )
}


# Fit a trend line for scatter_plot().
# Fits on log10 values when an axis uses a log scale, and returns the line
# (and 95% confidence band) on an 80-point grid, back-transformed.
# @noRd
fit_scatter_trend <- function(xx, yy, method, ci, span, x_log, y_log, group) {
  tx <- if (x_log) log10(xx) else xx
  ty <- if (y_log) log10(yy) else yy
  if (length(unique(tx)) < 3) return(NULL)

  grid <- seq(min(tx), max(tx), length.out = 80)
  stats_out <- list(n = length(tx))

  if (method == "lm") {
    m <- stats::lm(ty ~ tx)
    p <- stats::predict(m, newdata = data.frame(tx = grid),
                        interval = "confidence", level = 0.95)
    fit <- as.numeric(p[, "fit"])
    lo <- as.numeric(p[, "lwr"])
    hi <- as.numeric(p[, "upr"])
    cf <- stats::coef(m)
    stats_out$slope <- unname(cf[2])
    stats_out$intercept <- unname(cf[1])
    stats_out$r2 <- summary(m)$r.squared
  } else {
    m <- tryCatch(suppressWarnings(stats::loess(ty ~ tx, span = span)),
                  error = function(e) NULL)
    if (is.null(m)) return(NULL)
    p <- tryCatch(suppressWarnings(stats::predict(m, newdata = data.frame(tx = grid), se = TRUE)),
                  error = function(e) NULL)
    if (is.null(p)) return(NULL)
    fit <- as.numeric(p$fit)
    tq <- if (is.finite(p$df) && p$df > 0) stats::qt(0.975, p$df) else 1.96
    lo <- fit - tq * as.numeric(p$se.fit)
    hi <- fit + tq * as.numeric(p$se.fit)
    stats_out$span <- span
  }

  ok <- is.finite(fit)
  if (sum(ok) < 2) return(NULL)
  back_x <- function(v) if (x_log) 10^v else v
  back_y <- function(v) if (y_log) 10^v else v
  band_ok <- ci && all(is.finite(lo[ok])) && all(is.finite(hi[ok]))

  list(
    group = group,
    method = method,
    x = back_x(grid[ok]),
    y = back_y(fit[ok]),
    lo = if (band_ok) back_y(lo[ok]) else NULL,
    hi = if (band_ok) back_y(hi[ok]) else NULL,
    stats = stats_out
  )
}
