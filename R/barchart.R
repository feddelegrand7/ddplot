#' Create an interactive bar chart.
#'
#' Draws one bar per category, or, with \code{group}, grouped, stacked or
#' 100\% stacked bars. The data can be one row per bar, or raw rows that are
#' aggregated for you (\code{agg}); leave \code{y} empty to count rows. Bars
#' grow in when the chart is drawn, show their values, and can be re-sorted
#' and re-arranged from the chart itself.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover a bar to see its value, its share of the total and its rank;
#'     with \code{group}, the tooltip lists every group for that category.
#'   \item The buttons at the top right switch between grouped, stacked and
#'     100\% bars (with \code{group}) and between the original order, largest
#'     first and smallest first.
#'   \item Click a legend entry to hide or show a group, double-click it to
#'     isolate it. Hovering a legend entry highlights the group.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a bar sets \code{input$id_clicked} to a list with the
#' \code{category} and \code{group} of the bar. The layout, the sort order and
#' the hidden groups are kept when the chart is re-rendered.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The name of the categorical variable (one bar per value).
#' @param y The name of the numeric variable. When \code{NULL}, the rows of
#'   each category are counted.
#' @param fill The colour of the bars. A single colour, or, without
#'   \code{group}, one colour per category (recycled; a named vector maps
#'   colours to categories). With \code{group}, one colour per group (a named
#'   vector maps colours to groups). Defaults to a built-in palette.
#' @param sort The initial order of the bars: \code{"none"} (default, the
#'   order of the data or of the factor levels), \code{"ascending"} or
#'   \code{"descending"}. With \code{group}, categories are sorted by their
#'   total.
#' @param paddingWidth The space between bars, from 0 to 0.99. Defaults to
#'   0.2.
#' @param xticks Not used; kept for compatibility.
#' @param xFontSize The font size of the category labels. Defaults to 11.
#' @param yFontSize The font size of the value axis labels. Defaults to 11.
#' @param yticks Optional. The approximate number of value axis ticks.
#' @param xtitle Optional. The title of the category axis.
#' @param xtitleFontSize The font size of the category axis title. Defaults
#'   to 13.
#' @param ytitle Optional. The title of the value axis, drawn above it.
#'   Defaults to the name of \code{y} (or "Count"); use \code{""} to hide it.
#' @param ytitleFontSize The font size of the value axis title. Defaults to 13.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 20.
#' @param stroke Optional. The stroke colour of the bars.
#' @param strokeWidth Optional. The stroke width of the bars.
#' @param font The font family to consider for the titles. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param opacity The opacity of the bars (from 0 to 1). Defaults to 1.
#' @param axisCol The colour of the axes, labels and titles. Defaults to
#'   "#333333".
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#' @param group Optional. The name of a column that splits each bar into
#'   groups (one colour per group, with a clickable legend).
#' @param position How groups are drawn: \code{"grouped"} (default, side by
#'   side), \code{"stacked"} or \code{"percent"} (stacked to 100\%). It can be
#'   changed from the chart when \code{controls = TRUE}.
#' @param agg How rows with the same category (and group) are combined:
#'   \code{"sum"} (default), \code{"mean"}, \code{"median"}, \code{"min"},
#'   \code{"max"} or \code{"count"}. With one row per bar, every option but
#'   \code{"count"} returns the value itself.
#' @param labels Logical. Write the values on the bars (labels that do not fit
#'   are skipped). Defaults to \code{TRUE}.
#' @param highlight Optional. A character vector of categories to emphasise;
#'   the other bars are drawn in grey (or faded, with \code{group}).
#' @param refLines Optional. Numeric values drawn as dashed reference lines
#'   across the bars (e.g. a target or an average); names are used as labels.
#' @param negativeFill Optional. The colour of negative bars (without
#'   \code{group}).
#' @param cornerRadius The radius of the rounded bar ends, in pixels.
#'   Defaults to 3; use 0 for square bars.
#' @param legend Logical. Show the legend. When \code{NULL} (default), it is
#'   shown when \code{group} is used.
#' @param controls Logical. Show the layout and sort buttons. Defaults to
#'   \code{TRUE}.
#' @param tooltip Logical. Show a tooltip on hover. Defaults to \code{TRUE}.
#' @param animate Logical. Animate the bars when the chart is first drawn.
#'   Defaults to \code{TRUE}.
#' @param valueFormat Optional. A d3-format string for the values, e.g.
#'   \code{",.0f"}, \code{".1f"} or \code{"~s"}.
#' @param valuePrefix,valueSuffix Optional. Text added before or after every
#'   value, e.g. \code{"$"} or \code{" km"}.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitleFontSize The font size of the subtitle. Defaults to 13.
#' @param gridCol The colour of the grid lines. Defaults to "#e9e9e9"; use
#'   \code{NA} to hide them.
#'
#' @return An interactive SVG bar chart (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(ggplot2) # needed for the mpg data frame
#' library(dplyr) # needed for data wrangling
#'
#' mpg %>% group_by(manufacturer) %>%
#'   summarise(mean_cty = mean(cty)) %>%
#'   bar_chart(
#'     x = "manufacturer",
#'     y = "mean_cty",
#'     sort = "descending",
#'     ytitle = "Average city miles per gallon",
#'     title = "City fuel economy by manufacturer",
#'     highlight = c("honda", "volkswagen"),
#'     valueFormat = ".1f"
#'   )
#'
#' # Count rows, without aggregating first
#' bar_chart(mpg, x = "class", sort = "descending", title = "Cars per class")
#'
#' # Grouped bars from raw data; switch to stacked or 100% from the chart
#' bar_chart(
#'   data = mpg,
#'   x = "class",
#'   group = "drv",
#'   sort = "descending",
#'   title = "Cars per class and drive train",
#'   fill = c("4" = "#4269d0", "f" = "#efb118", "r" = "#ff725c")
#' )
#'
#' # Stacked, with a reference line
#' sales <- data.frame(
#'   quarter = rep(c("Q1", "Q2", "Q3", "Q4"), each = 3),
#'   region  = rep(c("North", "South", "West"), 4),
#'   revenue = c(120, 95, 60, 135, 90, 72, 150, 110, 80, 170, 105, 96)
#' )
#' bar_chart(
#'   sales, x = "quarter", y = "revenue", group = "region",
#'   position = "stacked", refLines = c(Target = 300),
#'   valuePrefix = "$", valueSuffix = "k",
#'   title = "Revenue by quarter"
#' )
#'
bar_chart <- function(
                     data,
                     x,
                     y = NULL,
                     fill = NULL,
                     sort = "none",
                     paddingWidth = 0.2,
                     xticks = NULL,
                     xFontSize = 11,
                     yFontSize = 11,
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
                     opacity = 1,
                     axisCol = "#333333",
                     width = NULL,
                     height = NULL,
                     group = NULL,
                     position = c("grouped", "stacked", "percent"),
                     agg = c("sum", "mean", "median", "min", "max", "count"),
                     labels = TRUE,
                     highlight = NULL,
                     refLines = NULL,
                     negativeFill = NULL,
                     cornerRadius = 3,
                     legend = NULL,
                     controls = TRUE,
                     tooltip = TRUE,
                     animate = TRUE,
                     valueFormat = NULL,
                     valuePrefix = "",
                     valueSuffix = "",
                     subtitle = NULL,
                     subtitleFontSize = 13,
                     gridCol = "#e9e9e9"
                     ) {

  if (!is.data.frame(data) || !is.character(x) || length(x) != 1 || is.null(data[[x]]) ||
      (!is.null(y) && (!is.character(y) || length(y) != 1 || is.null(data[[y]])))) {
    stop("Please check that x and y belong to the specified data frame")
  }

  bar_widget(
    data = data, cat = x, val = y, orientation = "vertical",
    fill = fill, sort = sort, paddingWidth = paddingWidth,
    catFontSize = xFontSize, valFontSize = yFontSize, valTicks = yticks,
    catTitle = xtitle, catTitleFontSize = xtitleFontSize,
    valTitle = ytitle, valTitleFontSize = ytitleFontSize,
    title = title, titleFontSize = titleFontSize,
    subtitle = subtitle, subtitleFontSize = subtitleFontSize,
    stroke = stroke, strokeWidth = strokeWidth, font = font, bgcol = bgcol,
    opacity = opacity, axisCol = axisCol, gridCol = gridCol,
    width = width, height = height,
    group = group, position = match.arg(position), agg = match.arg(agg),
    labels = labels, highlight = highlight, refLines = refLines,
    negativeFill = negativeFill, cornerRadius = cornerRadius, legend = legend,
    controls = controls, tooltip = tooltip, animate = animate,
    valueFormat = valueFormat, valuePrefix = valuePrefix, valueSuffix = valueSuffix
  )
}


# Shared builder for bar_chart() and horz_bar_chart(): validates the
# arguments, aggregates the data to one value per category (and group), and
# calls barchart.js.
# @noRd
bar_widget <- function(data, cat, val, orientation, fill, sort, paddingWidth,
                       catFontSize, valFontSize, valTicks,
                       catTitle, catTitleFontSize, valTitle, valTitleFontSize,
                       title, titleFontSize, subtitle, subtitleFontSize,
                       stroke, strokeWidth, font, bgcol, opacity, axisCol, gridCol,
                       width, height, group, position, agg, labels, highlight,
                       refLines, negativeFill, cornerRadius, legend, controls,
                       tooltip, animate, valueFormat, valuePrefix, valueSuffix) {

  if (length(sort) != 1 || !sort %in% c("none", "ascending", "descending")) {
    stop("
    the sort parameter can only take the following values:
    'none', 'ascending' or 'descending'
       ")
  }
  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  if (!is.numeric(paddingWidth) || length(paddingWidth) != 1 ||
      paddingWidth < 0 || paddingWidth > 0.99) {
    stop("'paddingWidth' must be a number between 0 and 0.99")
  }
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a number between 0 and 1")
  }
  if (!is.null(group) && (!is.character(group) || length(group) != 1 || is.null(data[[group]]))) {
    stop("'group' must be the name of a column of 'data'")
  }
  if (!is.null(refLines) && !is.numeric(refLines)) {
    stop("'refLines' must be a numeric vector")
  }

  # ---- categories --------------------------------------------------------------
  as_levels <- function(v, keep_order) {
    if (is.factor(v)) {
      lv <- levels(droplevels(v))
      v <- as.character(v)
    } else {
      v <- as.character(v)
      lv <- if (keep_order) unique(v[!is.na(v)]) else sort(unique(v[!is.na(v)]))
    }
    if (anyNA(v)) {
      v[is.na(v)] <- "(missing)"
      lv <- c(lv, "(missing)")
    }
    list(values = v, levels = lv)
  }

  cv <- as_levels(data[[cat]], keep_order = TRUE)
  gv <- if (is.null(group)) NULL else as_levels(data[[group]], keep_order = FALSE)

  if (is.null(val)) {
    agg <- "count"
    vv <- rep(1, nrow(data))
  } else {
    vv <- data[[val]]
    if (!is.numeric(vv) && agg != "count") {
      stop("'", val, "' must be a numeric column (or use agg = \"count\")")
    }
    if (!is.numeric(vv)) vv <- rep(1, nrow(data))
  }

  df <- data.frame(c = cv$values, g = if (is.null(gv)) "" else gv$values, v = as.numeric(vv),
                   stringsAsFactors = FALSE)
  if (agg != "count") df <- df[is.finite(df$v), , drop = FALSE]
  if (nrow(df) == 0) stop("no data left to plot")

  fun <- switch(agg,
    sum = sum, mean = mean, median = stats::median, min = min, max = max,
    count = length
  )
  key <- paste(df$c, df$g, sep = "\r")
  idx <- split(seq_len(nrow(df)), factor(key, levels = unique(key)))
  pts <- data.frame(
    c = vapply(idx, function(k) df$c[k[1]], ""),
    g = vapply(idx, function(k) df$g[k[1]], ""),
    v = vapply(idx, function(k) as.numeric(fun(df$v[k])), 0),
    n = vapply(idx, length, 0L),
    stringsAsFactors = FALSE, row.names = NULL
  )

  cats <- cv$levels[cv$levels %in% pts$c]
  groups <- if (is.null(gv)) NULL else gv$levels[gv$levels %in% pts$g]

  # ---- colours -----------------------------------------------------------------
  palette <- c("#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
               "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0")
  map_colours <- function(keys, default) {
    out <- rep_len(default, length(keys))
    if (!is.null(fill)) {
      if (!is.null(names(fill))) {
        m <- fill[keys]
        out[!is.na(m)] <- m[!is.na(m)]
      } else {
        out <- rep_len(as.character(fill), length(keys))
      }
    }
    unname(as.character(out))
  }
  group_colors <- NULL
  cat_colors <- NULL
  bar_fill <- palette[1]
  if (!is.null(groups)) {
    group_colors <- if (length(fill) == 1 && is.null(names(fill))) {
      rep_len(palette, length(groups)) # a single colour cannot tell groups apart
    } else {
      map_colours(groups, palette)
    }
  } else if (!is.null(fill) && (length(fill) > 1 || !is.null(names(fill)))) {
    cat_colors <- map_colours(cats, palette[1])
  } else if (!is.null(fill)) {
    bar_fill <- as.character(fill)
  }

  # ---- titles --------------------------------------------------------------------
  if (is.null(valTitle)) {
    valTitle <- if (agg == "count") {
      "Count"
    } else if (agg %in% c("mean", "median", "min", "max") && any(pts$n > 1)) {
      paste0(c(mean = "Mean", median = "Median", min = "Minimum", max = "Maximum")[[agg]], " of ", val)
    } else {
      val
    }
  }

  ref_list <- NULL
  if (!is.null(refLines)) {
    lab <- if (is.null(names(refLines))) rep("", length(refLines)) else names(refLines)
    ref_list <- lapply(seq_along(refLines), function(k) list(value = unname(refLines[k]), label = lab[k]))
  }

  if (is.null(legend)) legend <- !is.null(groups)

  r2d3::r2d3(
    data = pts,
    script = ddplot_script("barchart.js"),
    options = list(
      orientation = orientation,
      stateKey = paste(orientation, cat, val, group, agg, sep = "|"),
      categories = as.list(cats),
      groups = as.list(groups),
      groupName = group,
      catName = cat,
      valName = if (is.null(val)) "Count" else val,
      agg = agg,
      fill = bar_fill,
      colors = as.list(group_colors),
      catColors = as.list(cat_colors),
      negativeFill = negativeFill,
      sort = sort,
      position = position,
      paddingWidth = paddingWidth,
      labels = isTRUE(labels),
      highlight = as.list(as.character(highlight)),
      refLines = ref_list,
      cornerRadius = cornerRadius,
      legend = isTRUE(legend),
      controls = isTRUE(controls),
      tooltip = isTRUE(tooltip),
      animate = isTRUE(animate),
      valueFormat = valueFormat,
      valuePrefix = valuePrefix,
      valueSuffix = valueSuffix,
      valTicks = valTicks,
      catFontSize = catFontSize,
      valFontSize = valFontSize,
      catTitle = catTitle,
      catTitleFontSize = catTitleFontSize,
      valTitle = valTitle,
      valTitleFontSize = valTitleFontSize,
      title = title,
      titleFontSize = titleFontSize,
      subtitle = subtitle,
      subtitleFontSize = subtitleFontSize,
      stroke = stroke,
      strokeWidth = strokeWidth,
      font = font,
      bgcol = bgcol,
      opacity = opacity,
      axisCol = axisCol,
      gridCol = if (is.null(gridCol) || is.na(gridCol)) NULL else gridCol,
      width = width,
      height = height
    )
  )
}
