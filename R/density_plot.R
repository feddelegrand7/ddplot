#' Create a density plot
#'
#' Draws a smooth estimate of the distribution of a numeric variable, one
#' curve per group, overlapping or stacked. The densities are computed in R
#' with \code{stats::density()}, so they match \code{plot(density(x))} and
#' \code{ggplot2::geom_density()}.
#'
#' @section Interactions:
#' Move the mouse over the chart: a vertical guide follows it and the tooltip
#' gives the density of every group at that value. Click a group in the legend
#' to hide or show it. The curves rise from the axis when the chart is drawn.
#' Inside Shiny, clicking the chart sets \code{input$<id>_clicked} to a list
#' with the \code{x} value and the densities.
#'
#' @param data A data frame.
#' @param x The name of the numeric column.
#' @param group Optional. The name of a column that splits the data into
#'   curves. Factor levels give the order.
#' @param bandwidth Optional. The smoothing bandwidth, a number or the name of
#'   a rule understood by \code{stats::density()} (\code{"nrd0"},
#'   \code{"nrd"}, \code{"ucv"}, \code{"bcv"}, \code{"SJ"}). Defaults to
#'   \code{"nrd0"}.
#' @param adjust A multiplier of the bandwidth: values above 1 give smoother
#'   curves. Defaults to 1.
#' @param position \code{"identity"} (the default) draws the curves on top of
#'   each other, \code{"stack"} stacks them (each curve weighted by the size of
#'   its group) and \code{"fill"} shows the share of each group at every value.
#' @param stat Optional reference lines per curve: \code{"none"} (the
#'   default), \code{"mean"} or \code{"median"}.
#' @param rug Logical. Draw the observations as small ticks along the axis.
#'   Defaults to TRUE when there are at most 1000 of them.
#' @param colors Optional. Colours of the curves: one per group, or a named
#'   vector matched to the groups.
#' @param fill_opacity The opacity of the areas. Defaults to 0.35.
#' @param line_width The width of the curves. Defaults to 2.
#' @param value_format A d3 format for the x values in the tooltip. Defaults
#'   to ",.2~f".
#' @param x_title,y_title Optional. The titles of the axes. The x axis is
#'   titled with \code{x} by default.
#' @param axis_title_font_size The font size of the axis titles. Defaults to 12.
#' @param x_font_size,y_font_size The font sizes of the tick labels. Default
#'   to 11.
#' @param legend Logical. Show a legend when there are groups. Defaults to TRUE.
#' @param legend_font_size The font size of the legend. Defaults to 11.
#' @param hover Logical. Show the guide and the tooltip. Defaults to TRUE.
#' @param animate Logical. Let the curves rise when the chart is drawn.
#'   Defaults to TRUE.
#' @param title Optional. The title of the chart.
#' @param title_font_size The font size of the title. Defaults to 16.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bg_col The background colour. Defaults to "white".
#' @param text_col The colour of the text and the axes. Defaults to "#333333".
#' @param grid_col The colour of the grid lines; \code{NULL} for none. Defaults
#'   to "#ececec".
#' @param width,height Optional. The size of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' density_plot(faithful, x = "eruptions", title = "Old Faithful eruptions",
#'              x_title = "Duration (minutes)")
#'
#' density_plot(iris, x = "Petal.Length", group = "Species", stat = "median")
#'
#' density_plot(
#'   ggplot2::diamonds,
#'   x = "price",
#'   group = "cut",
#'   position = "fill",
#'   rug = FALSE,
#'   title = "Share of each cut along the price range"
#' )
#'
#' @export
density_plot <- function(
    data,
    x,
    group = NULL,
    bandwidth = "nrd0",
    adjust = 1,
    position = c("identity", "stack", "fill"),
    stat = c("none", "mean", "median"),
    rug = NULL,
    colors = NULL,
    fill_opacity = 0.35,
    line_width = 2,
    value_format = ",.2~f",
    x_title = NULL,
    y_title = NULL,
    axis_title_font_size = 12,
    x_font_size = 11,
    y_font_size = 11,
    legend = TRUE,
    legend_font_size = 11,
    hover = TRUE,
    animate = TRUE,
    title = NULL,
    title_font_size = 16,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col = "white",
    text_col = "#333333",
    grid_col = "#ececec",
    width = NULL,
    height = NULL
) {
  ck_df(data)
  ck_col(data, x, "x", numeric = TRUE)
  ck_col(data, group, "group", null_ok = TRUE)
  position <- match.arg(position)
  stat <- match.arg(stat)
  ck_num(adjust, "adjust", 0.01)
  ck_num(fill_opacity, "fill_opacity", 0, 1)
  ck_num(line_width, "line_width", 0)
  for (a in c("legend", "hover", "animate")) ck_flag(get(a), a)
  ck_string(value_format, "value_format", null_ok = FALSE)
  font <- ck_font(font)
  if (!(is.numeric(bandwidth) && length(bandwidth) == 1 && bandwidth > 0) &&
      !(is.character(bandwidth) && length(bandwidth) == 1 && bandwidth %in% c("nrd0", "nrd", "ucv", "bcv", "SJ"))) {
    stop("'bandwidth' must be a positive number or one of 'nrd0', 'nrd', 'ucv', 'bcv', 'SJ'")
  }

  v <- data[[x]]
  g <- if (is.null(group)) rep(x, length(v)) else data[[group]]
  levels <- if (is.null(group)) x else ck_levels(g)
  g <- as.character(g)
  keep <- is.finite(v) & !is.na(g)
  if (sum(keep) < 2) stop("Column '", x, "' needs at least two finite values")
  rng <- range(v[keep])
  # a common grid so that the curves can be stacked
  bws <- vapply(levels, function(lv) {
    xx <- v[keep & g == lv]
    if (length(xx) < 2) return(NA_real_)
    if (is.numeric(bandwidth)) bandwidth * adjust else stats::bw.nrd0(xx) * adjust
  }, numeric(1))
  ext <- 3 * max(bws, na.rm = TRUE)
  if (!is.finite(ext)) ext <- diff(rng) * 0.1
  from <- rng[1] - ext
  to <- rng[2] + ext
  if (position == "fill") { from <- rng[1]; to <- rng[2] }
  n_obs <- sum(keep)
  curves <- lapply(levels, function(lv) {
    xx <- v[keep & g == lv]
    if (length(xx) < 2) return(NULL)
    d <- stats::density(xx, bw = bandwidth, adjust = adjust, from = from, to = to, n = 256)
    list(
      name = lv, n = length(xx), bw = d$bw,
      y = as.list(d$y), mean = base::mean(xx), median = stats::median(xx),
      weight = length(xx) / n_obs
    )
  })
  curves <- Filter(Negate(is.null), curves)
  if (length(curves) == 0) stop("Every group needs at least two values")
  if (is.null(rug)) rug <- n_obs <= 1000
  ck_flag(rug, "rug")
  rug_data <- NULL
  if (rug) {
    idx <- if (n_obs > 4000) sample(which(keep), 4000) else which(keep)
    rug_data <- list(v = as.list(v[idx]), g = as.list(match(g[idx], vapply(curves, `[[`, character(1), "name")) - 1))
  }

  r2d3::r2d3(
    data = NULL,
    script = chart_script("densityplot.js"),
    width = width,
    height = height,
    options = list(
      curves = curves,
      from = from,
      to = to,
      rug = rug_data,
      hasGroup = !is.null(group),
      colors = ck_colors(colors, vapply(curves, `[[`, character(1), "name")),
      position = position,
      stat = stat,
      fillOpacity = fill_opacity,
      lineWidth = line_width,
      valueFormat = value_format,
      xtitle = if (is.null(x_title)) x else x_title,
      ytitle = if (is.null(y_title)) (if (position == "fill") "Share" else "Density") else y_title,
      axisTitleFontSize = axis_title_font_size,
      xFontSize = x_font_size,
      yFontSize = y_font_size,
      legend = legend,
      legendFontSize = legend_font_size,
      hover = hover,
      animate = animate,
      title = title,
      titleFontSize = title_font_size,
      font = font,
      bgcol = bg_col,
      textCol = text_col,
      gridCol = grid_col
    )
  )
}
