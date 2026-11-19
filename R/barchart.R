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
#' @param padding_width The space between bars, from 0 to 0.99. Defaults to
#'   0.2.
#' @param x_ticks Not used; kept for compatibility.
#' @param x_font_size The font size of the category labels. Defaults to 11.
#' @param y_font_size The font size of the value axis labels. Defaults to 11.
#' @param y_ticks Optional. The approximate number of value axis ticks.
#' @param x_title Optional. The title of the category axis.
#' @param x_title_font_size The font size of the category axis title. Defaults
#'   to 13.
#' @param y_title Optional. The title of the value axis, drawn above it.
#'   Defaults to the name of \code{y} (or "Count"); use \code{""} to hide it.
#' @param y_title_font_size The font size of the value axis title. Defaults to 13.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 20.
#' @param stroke Optional. The stroke colour of the bars.
#' @param stroke_width Optional. The stroke width of the bars.
#' @param font The font family to consider for the titles. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bg_col The background color of the SVG. Defaults to "white".
#' @param opacity The opacity of the bars (from 0 to 1). Defaults to 1.
#' @param axis_col The colour of the axes, labels and titles. Defaults to
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
#' @param ref_lines Optional. Numeric values drawn as dashed reference lines
#'   across the bars (e.g. a target or an average); names are used as labels.
#' @param negative_fill Optional. The colour of negative bars (without
#'   \code{group}).
#' @param corner_radius The radius of the rounded bar ends, in pixels.
#'   Defaults to 3; use 0 for square bars.
#' @param legend Logical. Show the legend. When \code{NULL} (default), it is
#'   shown when \code{group} is used.
#' @param controls Logical. Show the layout and sort buttons. Defaults to
#'   \code{TRUE}.
#' @param tooltip Logical. Show a tooltip on hover. Defaults to \code{TRUE}.
#' @param animate Logical. Animate the bars when the chart is first drawn.
#'   Defaults to \code{TRUE}.
#' @param value_format Optional. A d3-format string for the values, e.g.
#'   \code{",.0f"}, \code{".1f"} or \code{"~s"}.
#' @param value_prefix,value_suffix Optional. Text added before or after every
#'   value, e.g. \code{"$"} or \code{" km"}.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param grid_col The colour of the grid lines. Defaults to "#e9e9e9"; use
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
#'     y_title = "Average city miles per gallon",
#'     title = "City fuel economy by manufacturer",
#'     highlight = c("honda", "volkswagen"),
#'     value_format = ".1f"
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
#'   position = "stacked", ref_lines = c(Target = 300),
#'   value_prefix = "$", value_suffix = "k",
#'   title = "Revenue by quarter"
#' )
#'
bar_chart <- function(
                     data,
                     x,
                     y = NULL,
                     fill = NULL,
                     sort = "none",
                     padding_width = 0.2,
                     x_ticks = NULL,
                     x_font_size = 11,
                     y_font_size = 11,
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
                     opacity = 1,
                     axis_col = "#333333",
                     width = NULL,
                     height = NULL,
                     group = NULL,
                     position = c("grouped", "stacked", "percent"),
                     agg = c("sum", "mean", "median", "min", "max", "count"),
                     labels = TRUE,
                     highlight = NULL,
                     ref_lines = NULL,
                     negative_fill = NULL,
                     corner_radius = 3,
                     legend = NULL,
                     controls = TRUE,
                     tooltip = TRUE,
                     animate = TRUE,
                     value_format = NULL,
                     value_prefix = "",
                     value_suffix = "",
                     subtitle = NULL,
                     subtitle_font_size = 13,
                     grid_col = "#e9e9e9"
                     ) {

  if (!is.data.frame(data) || !is.character(x) || length(x) != 1 || is.null(data[[x]]) ||
      (!is.null(y) && (!is.character(y) || length(y) != 1 || is.null(data[[y]])))) {
    stop("Please check that x and y belong to the specified data frame")
  }

  bar_widget(
    data = data, cat = x, val = y, orientation = "vertical",
    fill = fill, sort = sort, padding_width = padding_width,
    cat_font_size = x_font_size, val_font_size = y_font_size, val_ticks = y_ticks,
    cat_title = x_title, cat_title_font_size = x_title_font_size,
    val_title = y_title, val_title_font_size = y_title_font_size,
    title = title, title_font_size = title_font_size,
    subtitle = subtitle, subtitle_font_size = subtitle_font_size,
    stroke = stroke, stroke_width = stroke_width, font = font, bg_col = bg_col,
    opacity = opacity, axis_col = axis_col, grid_col = grid_col,
    width = width, height = height,
    group = group, position = match.arg(position), agg = match.arg(agg),
    labels = labels, highlight = highlight, ref_lines = ref_lines,
    negative_fill = negative_fill, corner_radius = corner_radius, legend = legend,
    controls = controls, tooltip = tooltip, animate = animate,
    value_format = value_format, value_prefix = value_prefix, value_suffix = value_suffix
  )
}


# Shared builder for bar_chart(), horz_bar_chart(), lollipop_chart() and
# horz_lollipop(): validates the arguments, aggregates the data to one value
# per category (and group), and calls barchart.js. shape = "lollipop" draws
# stems and dots instead of bars.
# @noRd
bar_widget <- function(data, cat, val, orientation, fill, sort, padding_width,
                       cat_font_size, val_font_size, val_ticks,
                       cat_title, cat_title_font_size, val_title, val_title_font_size,
                       title, title_font_size, subtitle, subtitle_font_size,
                       stroke, stroke_width, font, bg_col, opacity, axis_col, grid_col,
                       width, height, group, position, agg, labels, highlight,
                       ref_lines, negative_fill, corner_radius, legend, controls,
                       tooltip, animate, value_format, value_prefix, value_suffix,
                       shape = "bar", stem_width = NULL, stem_color = NULL,
                       dot_radius = NULL, dot_stroke = NULL, dot_stroke_width = NULL) {

  if (length(sort) != 1 || !sort %in% c("none", "ascending", "descending")) {
    stop("
    the sort parameter can only take the following values:
    'none', 'ascending' or 'descending'
       ")
  }
  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  if (!is.numeric(padding_width) || length(padding_width) != 1 ||
      padding_width < 0 || padding_width > 0.99) {
    stop("'padding_width' must be a number between 0 and 0.99")
  }
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a number between 0 and 1")
  }
  if (!is.null(group) && (!is.character(group) || length(group) != 1 || is.null(data[[group]]))) {
    stop("'group' must be the name of a column of 'data'")
  }
  if (!is.null(ref_lines) && !is.numeric(ref_lines)) {
    stop("'ref_lines' must be a numeric vector")
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
  if (is.null(val_title)) {
    val_title <- if (agg == "count") {
      "Count"
    } else if (agg %in% c("mean", "median", "min", "max") && any(pts$n > 1)) {
      paste0(c(mean = "Mean", median = "Median", min = "Minimum", max = "Maximum")[[agg]], " of ", val)
    } else {
      val
    }
  }

  ref_list <- NULL
  if (!is.null(ref_lines)) {
    lab <- if (is.null(names(ref_lines))) rep("", length(ref_lines)) else names(ref_lines)
    ref_list <- lapply(seq_along(ref_lines), function(k) list(value = unname(ref_lines[k]), label = lab[k]))
  }

  if (is.null(legend)) legend <- !is.null(groups)

  r2d3::r2d3(
    data = pts,
    script = ddplot_script("barchart.js"),
    options = list(
      orientation = orientation,
      shape = shape,
      stemWidth = stem_width,
      stemColor = stem_color,
      dotRadius = dot_radius,
      dotStroke = dot_stroke,
      dotStrokeWidth = dot_stroke_width,
      stateKey = paste(shape, orientation, cat, val, group, agg, sep = "|"),
      categories = as.list(cats),
      groups = as.list(groups),
      groupName = group,
      catName = cat,
      valName = if (is.null(val)) "Count" else val,
      agg = agg,
      fill = bar_fill,
      colors = as.list(group_colors),
      catColors = as.list(cat_colors),
      negativeFill = negative_fill,
      sort = sort,
      position = position,
      paddingWidth = padding_width,
      labels = isTRUE(labels),
      highlight = as.list(as.character(highlight)),
      refLines = ref_list,
      cornerRadius = corner_radius,
      legend = isTRUE(legend),
      controls = isTRUE(controls),
      tooltip = isTRUE(tooltip),
      animate = isTRUE(animate),
      valueFormat = value_format,
      valuePrefix = value_prefix,
      valueSuffix = value_suffix,
      valTicks = val_ticks,
      catFontSize = cat_font_size,
      valFontSize = val_font_size,
      catTitle = cat_title,
      catTitleFontSize = cat_title_font_size,
      valTitle = val_title,
      valTitleFontSize = val_title_font_size,
      title = title,
      titleFontSize = title_font_size,
      subtitle = subtitle,
      subtitleFontSize = subtitle_font_size,
      stroke = stroke,
      strokeWidth = stroke_width,
      font = font,
      bgcol = bg_col,
      opacity = opacity,
      axisCol = axis_col,
      gridCol = if (is.null(grid_col) || is.na(grid_col)) NULL else grid_col,
      width = width,
      height = height
    )
  )
}
