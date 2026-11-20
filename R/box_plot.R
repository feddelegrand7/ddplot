#' Create a box plot
#'
#' Draws one box and whiskers per group: the box spans the first to the third
#' quartile, the thick line is the median, the whiskers reach the most extreme
#' values within 1.5 times the interquartile range, and the points beyond them
#' are drawn as outliers. The quartiles are computed in R
#' (\code{stats::quantile()}, type 7), so they match \code{boxplot()} and
#' \code{ggplot2::geom_boxplot()}.
#'
#' @section Interactions:
#' Hover a box to see its summary (count, quartiles, mean, whiskers and number
#' of outliers) while the other boxes fade, and hover a point to see its value.
#' The boxes grow from their median when the chart is drawn. Inside Shiny,
#' clicking a box sets \code{input$<id>_clicked} to a list with the
#' \code{group} and its summary.
#'
#' @param data A data frame.
#' @param y The name of the numeric column to summarise.
#' @param group Optional. The name of a column that splits the data into
#'   boxes. Factor levels give the order.
#' @param horizontal Logical. Draw horizontal boxes. Defaults to FALSE.
#' @param points Which points to draw: \code{"outliers"} (the default),
#'   \code{"all"} (every observation, jittered over the box) or \code{"none"}.
#' @param notch Logical. Draw notches around the median (roughly a 95 percent
#'   interval for it). Defaults to FALSE.
#' @param mean Logical. Mark the mean with a diamond. Defaults to TRUE.
#' @param sort How to order the boxes: \code{"none"} (the default),
#'   \code{"median"} or \code{"mean"} (ascending).
#' @param colors Optional. Colours of the boxes: one colour, one per group, or
#'   a named vector matched to the groups.
#' @param box_width The width of the boxes, as a share of the space of each
#'   group (between 0.1 and 1). Defaults to 0.6.
#' @param point_radius The radius of the points in pixels. Defaults to 3.
#' @param value_format A d3 format for the values in the tooltips. Defaults to
#'   ",.2~f".
#' @param x_title,y_title Optional. The titles of the axes. By default the
#'   value axis is titled with \code{y} and the group axis with \code{group}.
#' @param axis_title_font_size The font size of the axis titles. Defaults to 12.
#' @param x_font_size,y_font_size The font sizes of the tick labels. Default
#'   to 11.
#' @param hover Logical. Show tooltips and highlight on hover. Defaults to TRUE.
#' @param animate Logical. Grow the boxes when the chart is drawn. Defaults to
#'   TRUE.
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
#' box_plot(iris, y = "Sepal.Length", group = "Species", title = "Sepal length")
#'
#' box_plot(
#'   mtcars,
#'   y = "mpg",
#'   group = "cyl",
#'   points = "all",
#'   notch = TRUE,
#'   colors = c("#4269d0", "#efb118", "#ff725c"),
#'   y_title = "Miles per gallon",
#'   x_title = "Cylinders"
#' )
#'
#' box_plot(
#'   ToothGrowth,
#'   y = "len",
#'   group = "dose",
#'   horizontal = TRUE,
#'   sort = "median",
#'   title = "Tooth length by dose"
#' )
#'
#' @export
box_plot <- function(
    data,
    y,
    group = NULL,
    horizontal = FALSE,
    points = c("outliers", "all", "none"),
    notch = FALSE,
    mean = TRUE,
    sort = c("none", "median", "mean"),
    colors = NULL,
    box_width = 0.6,
    point_radius = 3,
    value_format = ",.2~f",
    x_title = NULL,
    y_title = NULL,
    axis_title_font_size = 12,
    x_font_size = 11,
    y_font_size = 11,
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
  ck_col(data, y, "y", numeric = TRUE)
  ck_col(data, group, "group", null_ok = TRUE)
  points <- match.arg(points)
  sort <- match.arg(sort)
  ck_flag(horizontal, "horizontal")
  ck_flag(notch, "notch")
  ck_flag(mean, "mean")
  ck_flag(hover, "hover")
  ck_flag(animate, "animate")
  ck_num(box_width, "box_width", 0.1, 1)
  ck_num(point_radius, "point_radius", 0)
  ck_string(value_format, "value_format", null_ok = FALSE)
  font <- ck_font(font)

  v <- data[[y]]
  g <- if (is.null(group)) rep(y, length(v)) else data[[group]]
  levels <- if (is.null(group)) y else ck_levels(g)
  g <- as.character(g)
  keep <- is.finite(v) & !is.na(g)
  stats <- lapply(levels, function(lv) {
    x <- sort(v[keep & g == lv])
    n <- length(x)
    if (n == 0) return(NULL)
    q <- stats::quantile(x, c(0.25, 0.5, 0.75), names = FALSE, type = 7)
    iqr <- q[3] - q[1]
    lo <- min(x[x >= q[1] - 1.5 * iqr])
    hi <- max(x[x <= q[3] + 1.5 * iqr])
    list(
      name = lv, n = n, min = x[1], max = x[n], q1 = q[1], median = q[2], q3 = q[3],
      mean = base::mean(x), lo = lo, hi = hi, notch = 1.58 * iqr / sqrt(n),
      out = as.list(x[x < lo | x > hi]),
      values = if (points == "all") as.list(x) else list()
    )
  })
  stats <- Filter(Negate(is.null), stats)
  if (length(stats) == 0) stop("Column '", y, "' has no finite values")
  if (sort != "none") stats <- stats[order(vapply(stats, `[[`, numeric(1), sort))]
  names_kept <- vapply(stats, `[[`, character(1), "name")
  value_title <- if (horizontal) x_title else y_title
  if (is.null(value_title)) value_title <- y
  group_title <- if (horizontal) y_title else x_title
  if (is.null(group_title)) group_title <- group

  r2d3::r2d3(
    data = NULL,
    script = chart_script("boxplot.js"),
    width = width,
    height = height,
    options = list(
      groups = stats,
      colors = ck_colors(colors, names_kept),
      hasGroup = !is.null(group),
      horizontal = horizontal,
      points = points,
      notch = notch,
      mean = mean,
      boxWidth = box_width,
      pointRadius = point_radius,
      valueFormat = value_format,
      valueTitle = value_title,
      groupTitle = group_title,
      axisTitleFontSize = axis_title_font_size,
      xFontSize = x_font_size,
      yFontSize = y_font_size,
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
