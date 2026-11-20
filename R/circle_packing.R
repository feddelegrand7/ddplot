#' Create a circle packing chart
#'
#' Draws a hierarchy as nested circles: every item is a circle whose area is
#' proportional to its value, packed inside the circle of its group, itself
#' packed inside the circle of its parent group, and so on. It shows the same
#' part-to-whole structure as a treemap, with the groups easier to tell apart.
#'
#' @section Interactions:
#' Hover a circle to see its value and its share of its group. Click a group
#' to zoom into it and click the background (or the zoomed group) to zoom
#' back out (\code{zoom}). The circles grow level by level when the chart is
#' drawn. Inside Shiny, clicking an item sets \code{input$<id>_clicked} to a
#' list with \code{label}, \code{value} and \code{path} (its groups).
#'
#' @param data A data frame with one row per item.
#' @param label The name of the column with the item names.
#' @param value Optional. The name of a numeric column with the sizes. When
#'   \code{NULL}, every row counts as 1.
#' @param group Optional. The names of one or more columns giving the groups,
#'   from the outermost to the innermost, such as \code{c("continent",
#'   "region")}.
#' @param colors Optional. Colours of the outermost groups: one per group or a
#'   named vector matched to the groups.
#' @param padding The space between circles in pixels. Defaults to 3.
#' @param show_labels Logical. Write the names of the circles that are large
#'   enough. Defaults to TRUE.
#' @param value_format A d3 format for the values. Defaults to ",.0f".
#' @param label_font_size The largest font size of the labels. Defaults to 11.
#' @param zoom Logical. Click a group to zoom into it. Defaults to TRUE.
#' @param legend Logical. Show a legend of the outermost groups. Defaults to
#'   TRUE.
#' @param legend_font_size The font size of the legend. Defaults to 11.
#' @param hover Logical. Show tooltips and highlight on hover. Defaults to TRUE.
#' @param animate Logical. Grow the circles when the chart is drawn. Defaults
#'   to TRUE.
#' @param title Optional. The title of the chart.
#' @param title_font_size The font size of the title. Defaults to 16.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bg_col The background colour. Defaults to "white".
#' @param text_col The colour of the text. Defaults to "#333333".
#' @param width,height Optional. The size of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' # World population in 2007, by continent and country
#' pop <- subset(gapminder::gapminder, year == 2007)
#' circle_packing(pop, label = "country", value = "pop", group = "continent",
#'                title = "World population, 2007")
#'
#' # Car models, grouped by manufacturer, sized by the number of versions
#' circle_packing(ggplot2::mpg, label = "model", group = "manufacturer",
#'                legend = FALSE)
#'
#' # Two levels of groups
#' sales <- data.frame(
#'   region = rep(c("North", "South"), each = 6),
#'   category = rep(rep(c("Furniture", "Office", "Tech"), each = 2), 2),
#'   product = c("Chairs", "Tables", "Paper", "Pens", "Phones", "Laptops",
#'               "Chairs", "Tables", "Paper", "Pens", "Phones", "Laptops"),
#'   revenue = c(120, 90, 40, 25, 210, 260, 80, 110, 55, 30, 160, 190)
#' )
#' circle_packing(sales, label = "product", value = "revenue",
#'                group = c("region", "category"), value_format = "$,.0f")
#'
#' @export
circle_packing <- function(
    data,
    label,
    value = NULL,
    group = NULL,
    colors = NULL,
    padding = 3,
    show_labels = TRUE,
    value_format = ",.0f",
    label_font_size = 11,
    zoom = TRUE,
    legend = TRUE,
    legend_font_size = 11,
    hover = TRUE,
    animate = TRUE,
    title = NULL,
    title_font_size = 16,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col = "white",
    text_col = "#333333",
    width = NULL,
    height = NULL
) {
  ck_df(data)
  ck_col(data, label, "label")
  ck_col(data, value, "value", numeric = TRUE, null_ok = TRUE)
  if (!is.null(group)) {
    if (!is.character(group) || length(group) == 0) stop("'group' must be one or more column names")
    for (g in group) ck_col(data, g, "group")
  }
  ck_num(padding, "padding", 0)
  for (a in c("show_labels", "zoom", "legend", "hover", "animate")) ck_flag(get(a), a)
  ck_string(value_format, "value_format", null_ok = FALSE)
  font <- ck_font(font)

  v <- if (is.null(value)) rep(1, nrow(data)) else as.numeric(data[[value]])
  keep <- !is.na(data[[label]]) & is.finite(v) & v > 0
  for (g in group) keep <- keep & !is.na(data[[g]])
  if (!any(keep)) stop("'data' has no positive values")
  items <- data.frame(label = as.character(data[[label]])[keep], value = v[keep], stringsAsFactors = FALSE)
  for (k in seq_along(group)) items[[paste0("g", k - 1)]] <- as.character(data[[group[k]]])[keep]
  # rows with the same label and groups are added up
  items <- stats::aggregate(items["value"], items[setdiff(names(items), "value")], sum)
  top_groups <- if (length(group)) ck_levels(data[[group[1]]][keep]) else character(0)

  r2d3::r2d3(
    data = items,
    script = chart_script("circlepacking.js"),
    width = width,
    height = height,
    options = list(
      depth = length(group),
      groupNames = as.list(group),
      topGroups = as.list(top_groups),
      valueName = if (is.null(value)) "Count" else value,
      colors = ck_colors(colors, if (length(top_groups)) top_groups else "all"),
      padding = padding,
      showLabels = show_labels,
      valueFormat = value_format,
      labelFontSize = label_font_size,
      zoom = zoom,
      legend = legend,
      legendFontSize = legend_font_size,
      hover = hover,
      animate = animate,
      title = title,
      titleFontSize = title_font_size,
      font = font,
      bgcol = bg_col,
      textCol = text_col
    )
  )
}
