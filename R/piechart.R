#' Create an interactive pie or donut chart
#'
#' Draws one slice per category, with its share of the total written on the
#' slice or next to it. Rows with the same label are added up, and the value
#' can be left empty to count rows. Small slices can be combined into an
#' "Other" slice. Set \code{inner_radius} to draw a donut chart, whose centre
#' shows the total, or the hovered slice.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover a slice (or its legend entry) to pull it out and see its
#'     value, its share of the total and its rank; the "Other" slice lists the
#'     categories it contains.
#'   \item Click a legend entry to hide or show a slice (the shares are then
#'     computed without it), double-click it to keep only that slice.
#'   \item Click a slice to pull it out, click it again to put it back.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a slice sets \code{input$id_clicked} to its label. The hidden
#' slices are kept when the chart is re-rendered.
#'
#' @param data The data frame to consider.
#' @param value The name of the numeric variable (the size of the slices).
#'   When \code{NULL}, the rows of each label are counted. Rows with the same
#'   label are added up; negative and missing values are left out.
#' @param label The name of the labelling variable (one slice per value).
#' @param color_category Optional. The name of a D3 categorical colour scheme,
#'   such as "Tableau10", "Set2" or "Paired" (see
#'   <https://github.com/d3/d3-scale-chromatic#categorical>), used when
#'   \code{fill} is not given. Defaults to the ddplot palette.
#' @param inner_radius The inner radius, for a donut chart: a number below 1 is
#'   a fraction of the outer radius (e.g. 0.6), a larger number is a radius in
#'   pixels. Defaults to 0 (a pie).
#' @param outer_radius The outer radius in pixels, or "auto" (default) to fill
#'   the space available.
#' @param pad_radius Optional. From the D3 documentation, the pad radius
#'   computes the fixed linear distance separating adjacent arcs, defined as
#'   pad_radius * pad_angle. Defaults to the D3 default.
#' @param pad_angle Optional. The padding angle between consecutive slices, in
#'   radians (e.g. 0.02).
#' @param corner_radius The radius of the rounded slice corners, in pixels.
#'   Defaults to 0.
#' @param label_font Optional. The font family of the legend. Defaults to
#'   \code{font}.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 20.
#' @param font The font family to consider for the titles.
#'   Defaults to "Verdana, Geneva, Tahoma, sans-serif".
#' @param bg_col The background color of the SVG. Defaults to "white".
#' @param opacity The opacity of the slices (from 0 to 1). Defaults to 1.
#' @param label_height Optional. The font size of the legend, in pixels.
#'   Defaults to 12.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#' @param fill Optional. The colours of the slices: one colour per slice, in
#'   the order of the slices (recycled), or a named vector mapping colours to
#'   labels.
#' @param sort The order of the slices, clockwise from the top:
#'   \code{"descending"} (default, largest first), \code{"ascending"} or
#'   \code{"none"} (the order of the data, or of the factor levels).
#' @param max_slices Optional. The maximum number of slices: the smallest
#'   categories are combined into an "Other" slice so that at most
#'   \code{max_slices} slices are drawn.
#' @param other_label The label of the combined slice. Defaults to "Other".
#' @param labels What to write for each slice: any of \code{"label"},
#'   \code{"value"} and \code{"percent"}, or \code{"none"}. Defaults to
#'   \code{"percent"} with a legend, \code{c("label", "percent")} without.
#' @param label_position Where the slice labels go: \code{"auto"} (default,
#'   inside the slices that are large enough, outside with a leader line for
#'   the others), \code{"inside"} or \code{"outside"}.
#' @param legend Logical. Show the legend (on the right when there is room,
#'   otherwise below). Defaults to \code{TRUE}.
#' @param center_label For a donut chart, the text shown under the total in
#'   the centre: \code{NULL} (default, "Total"), a string, or \code{FALSE} to
#'   leave the centre empty.
#' @param highlight Optional. A character vector of labels whose slices are
#'   pulled out.
#' @param start_angle,end_angle The angles where the pie starts and ends, in
#'   degrees, clockwise from the top. Defaults to 0 and 360; use -90 and 90 for
#'   a half donut.
#' @param stroke The colour of the lines between the slices. Defaults to the
#'   background colour.
#' @param stroke_width The width of the lines between the slices. Defaults to
#'   1.5 (0 when \code{pad_angle} is given).
#' @param tooltip Logical. Show a tooltip when hovering the slices. Defaults
#'   to \code{TRUE}.
#' @param animate Logical. Sweep the slices in when the chart is first drawn.
#'   Defaults to \code{TRUE}.
#' @param value_format Optional. A D3 format string for the values, such as
#'   \code{",.0f"} or \code{".2s"}.
#' @param value_prefix,value_suffix Optional. Text added before and after the
#'   values, such as \code{"$"} or \code{" kg"}.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param axis_col The colour of the texts. Defaults to "#333333".
#'
#' @return An interactive SVG pie chart (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(ggplot2) # needed for the mpg data frame
#'
#' # Rows are counted when there is no value
#' pie_chart(mpg, label = "class", title = "Cars by class")
#'
#' # A donut chart with the total in the centre
#' energy <- data.frame(
#'   source = c("Nuclear", "Hydro", "Wind", "Solar", "Gas", "Coal", "Other"),
#'   twh    = c(320, 58, 49, 23, 34, 3, 8)
#' )
#' pie_chart(
#'   energy, value = "twh", label = "source",
#'   inner_radius = 0.6, center_label = "TWh",
#'   title = "Electricity generation by source"
#' )
#'
#' # A half donut with the small slices combined
#' pie_chart(
#'   energy, value = "twh", label = "source",
#'   inner_radius = 0.55, start_angle = -90, end_angle = 90,
#'   max_slices = 4, legend = FALSE
#' )
#'
pie_chart <- function(
  data,
  value = NULL,
  label,
  color_category = NULL,
  inner_radius = 0,
  outer_radius = "auto",
  pad_radius = NULL,
  pad_angle = NULL,
  corner_radius = 0,
  label_font = NULL,
  title = NULL,
  title_font_size = 20,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bg_col = "white",
  opacity = 1,
  label_height = NULL,
  width = NULL,
  height = NULL,
  fill = NULL,
  sort = c("descending", "ascending", "none"),
  max_slices = NULL,
  other_label = "Other",
  labels = NULL,
  label_position = c("auto", "inside", "outside"),
  legend = TRUE,
  center_label = NULL,
  highlight = NULL,
  start_angle = 0,
  end_angle = 360,
  stroke = NULL,
  stroke_width = NULL,
  tooltip = TRUE,
  animate = TRUE,
  value_format = NULL,
  value_prefix = "",
  value_suffix = "",
  subtitle = NULL,
  subtitle_font_size = 13,
  axis_col = "#333333"
) {

  if (!is.data.frame(data) || missing(label) || !is.character(label) || length(label) != 1 ||
      is.null(data[[label]]) ||
      (!is.null(value) && (!is.character(value) || length(value) != 1 || is.null(data[[value]])))) {
    stop("Please check that 'value' and 'label' belongs to the specified data frame")
  }
  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  sort <- match.arg(sort)
  label_position <- match.arg(label_position)
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a number between 0 and 1")
  }
  if (!is.numeric(inner_radius) || length(inner_radius) != 1 || inner_radius < 0) {
    stop("'inner_radius' must be a single number, 0 or more")
  }
  if (!identical(outer_radius, "auto") &&
      (!is.numeric(outer_radius) || length(outer_radius) != 1 || !(outer_radius > 0))) {
    stop("'outer_radius' must be \"auto\" or a positive number of pixels")
  }
  if (!is.null(max_slices) && (!is.numeric(max_slices) || length(max_slices) != 1 || max_slices < 1)) {
    stop("'max_slices' must be a single number, 1 or more")
  }
  if (!is.numeric(start_angle) || !is.numeric(end_angle) || length(start_angle) != 1 ||
      length(end_angle) != 1 || end_angle <= start_angle || end_angle - start_angle > 360) {
    stop("'start_angle' and 'end_angle' must be angles in degrees, with start_angle < end_angle <= start_angle + 360")
  }
  if (isFALSE(labels)) labels <- "none"
  if (is.null(labels)) labels <- if (isTRUE(legend)) "percent" else c("label", "percent")
  if (!is.character(labels) || !all(labels %in% c("label", "value", "percent", "none"))) {
    stop("'labels' must be any of \"label\", \"value\" and \"percent\", or \"none\"")
  }
  if ("none" %in% labels) labels <- character(0)
  if (!is.null(color_category) && (!is.character(color_category) || length(color_category) != 1)) {
    stop("'color_category' must be the name of a D3 colour scheme, such as \"Tableau10\"")
  }

  # ---- slices --------------------------------------------------------------------
  lv <- data[[label]]
  if (is.factor(lv)) {
    levels_ <- levels(droplevels(lv))
    lv <- as.character(lv)
  } else {
    lv <- as.character(lv)
    levels_ <- unique(lv[!is.na(lv)])
  }
  if (anyNA(lv)) {
    lv[is.na(lv)] <- "(missing)"
    levels_ <- c(levels_, "(missing)")
  }
  if (is.null(value)) {
    vv <- rep(1, length(lv))
  } else {
    vv <- data[[value]]
    if (!is.numeric(vv)) stop("'", value, "' must be a numeric column")
    vv <- as.numeric(vv)
  }
  ok <- is.finite(vv) & vv >= 0
  if (any(is.finite(vv) & vv < 0)) {
    warning("negative values cannot be drawn in a pie chart and were left out")
  }
  sums <- tapply(vv[ok], factor(lv[ok], levels = levels_), sum)
  sums <- sums[!is.na(sums) & sums > 0]
  if (!length(sums)) stop("there is no positive value to plot")
  slices <- data.frame(label = names(sums), value = as.numeric(sums), stringsAsFactors = FALSE)
  slices$order <- seq_len(nrow(slices))

  # ---- colours (given to the categories before any are combined) ------------------
  palette <- c("#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
               "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0")
  slice_cols <- NULL
  by_size <- order(-slices$value, slices$order)
  if (!is.null(fill)) {
    if (!is.null(names(fill))) {
      slice_cols <- rep_len(palette, nrow(slices))
      slice_cols[by_size] <- rep_len(palette, nrow(slices))
      m <- fill[slices$label]
      slice_cols[!is.na(m)] <- m[!is.na(m)]
    } else {
      slice_cols <- rep_len(as.character(fill), nrow(slices))
    }
  } else if (is.null(color_category)) {
    # the largest slices get the first colours of the palette
    # (with many slices, lighter shades of the palette follow the palette)
    base <- palette[1:9]
    if (nrow(slices) > 9) {
      light <- vapply(base, function(h) {
        v <- strtoi(substring(h, c(2, 4, 6), c(3, 5, 7)), 16L)
        do.call(sprintf, c("#%02x%02x%02x", as.list(round(v * 0.55 + 255 * 0.45))))
      }, "")
      base <- c(base, unname(light))
    }
    slice_cols <- character(nrow(slices))
    slice_cols[by_size] <- rep_len(base, nrow(slices))
  }
  slices$color <- if (is.null(slice_cols)) NA_character_ else unname(as.character(slice_cols))

  # ---- "Other" ----------------------------------------------------------------------
  other <- NULL
  if (!is.null(max_slices) && nrow(slices) > max_slices) {
    keep_n <- max(1, floor(max_slices) - 1)
    keep <- sort(by_size[seq_len(keep_n)])
    rest <- setdiff(seq_len(nrow(slices)), keep)
    rest <- rest[order(-slices$value[rest])]
    other <- lapply(rest, function(k) list(label = slices$label[k], value = slices$value[k]))
    slices <- rbind(
      slices[keep, , drop = FALSE],
      data.frame(label = other_label, value = sum(slices$value[rest]),
                 order = max(slices$order) + 1, color = "#b8bdc4", stringsAsFactors = FALSE)
    )
    slices$other <- c(rep(FALSE, length(keep)), TRUE)
  } else {
    slices$other <- FALSE
  }

  if (identical(center_label, FALSE)) center_label <- ""
  if (is.null(center_label)) center_label <- "Total"

  r2d3::r2d3(
    data = slices,
    script = ddplot_script("piechart.js"),
    options = list(
      stateKey = paste("pie", label, value, max_slices, sep = "|"),
      valueName = if (is.null(value)) "Count" else value,
      counted = is.null(value),
      otherMembers = other,
      colorCategory = color_category,
      sort = sort,
      innerRadius = inner_radius,
      outerRadius = outer_radius,
      padRadius = pad_radius,
      padAngle = pad_angle,
      cornerRadius = corner_radius,
      labels = as.list(labels),
      labelPosition = label_position,
      legend = isTRUE(legend),
      centerLabel = as.character(center_label),
      highlight = as.list(as.character(highlight)),
      startAngle = start_angle,
      endAngle = end_angle,
      stroke = stroke,
      strokeWidth = stroke_width,
      tooltip = isTRUE(tooltip),
      animate = isTRUE(animate),
      valueFormat = value_format,
      valuePrefix = value_prefix,
      valueSuffix = value_suffix,
      title = title,
      titleFontSize = title_font_size,
      subtitle = subtitle,
      subtitleFontSize = subtitle_font_size,
      font = font,
      labelFont = if (is.null(label_font)) font else label_font,
      labelHeight = if (is.null(label_height)) 12 else label_height,
      bgcol = bg_col,
      opacity = opacity,
      axisCol = axis_col,
      width = width,
      height = height
    )
  )
}
