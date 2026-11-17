#' Create an interactive pie or donut chart
#'
#' Draws one slice per category, with its share of the total written on the
#' slice or next to it. Rows with the same label are added up, and the value
#' can be left empty to count rows. Small slices can be combined into an
#' "Other" slice. Set \code{innerRadius} to draw a donut chart, whose centre
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
#' @param colorCategory Optional. The name of a D3 categorical colour scheme,
#'   such as "Tableau10", "Set2" or "Paired" (see
#'   <https://github.com/d3/d3-scale-chromatic#categorical>), used when
#'   \code{fill} is not given. Defaults to the ddplot palette.
#' @param innerRadius The inner radius, for a donut chart: a number below 1 is
#'   a fraction of the outer radius (e.g. 0.6), a larger number is a radius in
#'   pixels. Defaults to 0 (a pie).
#' @param outerRadius The outer radius in pixels, or "auto" (default) to fill
#'   the space available.
#' @param padRadius Optional. From the D3 documentation, the pad radius
#'   computes the fixed linear distance separating adjacent arcs, defined as
#'   padRadius * padAngle. Defaults to the D3 default.
#' @param padAngle Optional. The padding angle between consecutive slices, in
#'   radians (e.g. 0.02).
#' @param cornerRadius The radius of the rounded slice corners, in pixels.
#'   Defaults to 0.
#' @param labelFont Optional. The font family of the legend. Defaults to
#'   \code{font}.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 20.
#' @param font The font family to consider for the titles.
#'   Defaults to "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param opacity The opacity of the slices (from 0 to 1). Defaults to 1.
#' @param labelHeight Optional. The font size of the legend, in pixels.
#'   Defaults to 12.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#' @param fill Optional. The colours of the slices: one colour per slice, in
#'   the order of the slices (recycled), or a named vector mapping colours to
#'   labels.
#' @param sort The order of the slices, clockwise from the top:
#'   \code{"descending"} (default, largest first), \code{"ascending"} or
#'   \code{"none"} (the order of the data, or of the factor levels).
#' @param maxSlices Optional. The maximum number of slices: the smallest
#'   categories are combined into an "Other" slice so that at most
#'   \code{maxSlices} slices are drawn.
#' @param otherLabel The label of the combined slice. Defaults to "Other".
#' @param labels What to write for each slice: any of \code{"label"},
#'   \code{"value"} and \code{"percent"}, or \code{"none"}. Defaults to
#'   \code{"percent"} with a legend, \code{c("label", "percent")} without.
#' @param labelPosition Where the slice labels go: \code{"auto"} (default,
#'   inside the slices that are large enough, outside with a leader line for
#'   the others), \code{"inside"} or \code{"outside"}.
#' @param legend Logical. Show the legend (on the right when there is room,
#'   otherwise below). Defaults to \code{TRUE}.
#' @param centerLabel For a donut chart, the text shown under the total in
#'   the centre: \code{NULL} (default, "Total"), a string, or \code{FALSE} to
#'   leave the centre empty.
#' @param highlight Optional. A character vector of labels whose slices are
#'   pulled out.
#' @param startAngle,endAngle The angles where the pie starts and ends, in
#'   degrees, clockwise from the top. Defaults to 0 and 360; use -90 and 90 for
#'   a half donut.
#' @param stroke The colour of the lines between the slices. Defaults to the
#'   background colour.
#' @param strokeWidth The width of the lines between the slices. Defaults to
#'   1.5 (0 when \code{padAngle} is given).
#' @param tooltip Logical. Show a tooltip when hovering the slices. Defaults
#'   to \code{TRUE}.
#' @param animate Logical. Sweep the slices in when the chart is first drawn.
#'   Defaults to \code{TRUE}.
#' @param valueFormat Optional. A D3 format string for the values, such as
#'   \code{",.0f"} or \code{".2s"}.
#' @param valuePrefix,valueSuffix Optional. Text added before and after the
#'   values, such as \code{"$"} or \code{" kg"}.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitleFontSize The font size of the subtitle. Defaults to 13.
#' @param axisCol The colour of the texts. Defaults to "#333333".
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
#'   innerRadius = 0.6, centerLabel = "TWh",
#'   title = "Electricity generation by source"
#' )
#'
#' # A half donut with the small slices combined
#' pie_chart(
#'   energy, value = "twh", label = "source",
#'   innerRadius = 0.55, startAngle = -90, endAngle = 90,
#'   maxSlices = 4, legend = FALSE
#' )
#'
pie_chart <- function(
  data,
  value = NULL,
  label,
  colorCategory = NULL,
  innerRadius = 0,
  outerRadius = "auto",
  padRadius = NULL,
  padAngle = NULL,
  cornerRadius = 0,
  labelFont = NULL,
  title = NULL,
  titleFontSize = 20,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "white",
  opacity = 1,
  labelHeight = NULL,
  width = NULL,
  height = NULL,
  fill = NULL,
  sort = c("descending", "ascending", "none"),
  maxSlices = NULL,
  otherLabel = "Other",
  labels = NULL,
  labelPosition = c("auto", "inside", "outside"),
  legend = TRUE,
  centerLabel = NULL,
  highlight = NULL,
  startAngle = 0,
  endAngle = 360,
  stroke = NULL,
  strokeWidth = NULL,
  tooltip = TRUE,
  animate = TRUE,
  valueFormat = NULL,
  valuePrefix = "",
  valueSuffix = "",
  subtitle = NULL,
  subtitleFontSize = 13,
  axisCol = "#333333"
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
  labelPosition <- match.arg(labelPosition)
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a number between 0 and 1")
  }
  if (!is.numeric(innerRadius) || length(innerRadius) != 1 || innerRadius < 0) {
    stop("'innerRadius' must be a single number, 0 or more")
  }
  if (!identical(outerRadius, "auto") &&
      (!is.numeric(outerRadius) || length(outerRadius) != 1 || !(outerRadius > 0))) {
    stop("'outerRadius' must be \"auto\" or a positive number of pixels")
  }
  if (!is.null(maxSlices) && (!is.numeric(maxSlices) || length(maxSlices) != 1 || maxSlices < 1)) {
    stop("'maxSlices' must be a single number, 1 or more")
  }
  if (!is.numeric(startAngle) || !is.numeric(endAngle) || length(startAngle) != 1 ||
      length(endAngle) != 1 || endAngle <= startAngle || endAngle - startAngle > 360) {
    stop("'startAngle' and 'endAngle' must be angles in degrees, with startAngle < endAngle <= startAngle + 360")
  }
  if (isFALSE(labels)) labels <- "none"
  if (is.null(labels)) labels <- if (isTRUE(legend)) "percent" else c("label", "percent")
  if (!is.character(labels) || !all(labels %in% c("label", "value", "percent", "none"))) {
    stop("'labels' must be any of \"label\", \"value\" and \"percent\", or \"none\"")
  }
  if ("none" %in% labels) labels <- character(0)
  if (!is.null(colorCategory) && (!is.character(colorCategory) || length(colorCategory) != 1)) {
    stop("'colorCategory' must be the name of a D3 colour scheme, such as \"Tableau10\"")
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
  } else if (is.null(colorCategory)) {
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
  if (!is.null(maxSlices) && nrow(slices) > maxSlices) {
    keep_n <- max(1, floor(maxSlices) - 1)
    keep <- sort(by_size[seq_len(keep_n)])
    rest <- setdiff(seq_len(nrow(slices)), keep)
    rest <- rest[order(-slices$value[rest])]
    other <- lapply(rest, function(k) list(label = slices$label[k], value = slices$value[k]))
    slices <- rbind(
      slices[keep, , drop = FALSE],
      data.frame(label = otherLabel, value = sum(slices$value[rest]),
                 order = max(slices$order) + 1, color = "#b8bdc4", stringsAsFactors = FALSE)
    )
    slices$other <- c(rep(FALSE, length(keep)), TRUE)
  } else {
    slices$other <- FALSE
  }

  if (identical(centerLabel, FALSE)) centerLabel <- ""
  if (is.null(centerLabel)) centerLabel <- "Total"

  r2d3::r2d3(
    data = slices,
    script = ddplot_script("piechart.js"),
    options = list(
      stateKey = paste("pie", label, value, maxSlices, sep = "|"),
      valueName = if (is.null(value)) "Count" else value,
      counted = is.null(value),
      otherMembers = other,
      colorCategory = colorCategory,
      sort = sort,
      innerRadius = innerRadius,
      outerRadius = outerRadius,
      padRadius = padRadius,
      padAngle = padAngle,
      cornerRadius = cornerRadius,
      labels = as.list(labels),
      labelPosition = labelPosition,
      legend = isTRUE(legend),
      centerLabel = as.character(centerLabel),
      highlight = as.list(as.character(highlight)),
      startAngle = startAngle,
      endAngle = endAngle,
      stroke = stroke,
      strokeWidth = strokeWidth,
      tooltip = isTRUE(tooltip),
      animate = isTRUE(animate),
      valueFormat = valueFormat,
      valuePrefix = valuePrefix,
      valueSuffix = valueSuffix,
      title = title,
      titleFontSize = titleFontSize,
      subtitle = subtitle,
      subtitleFontSize = subtitleFontSize,
      font = font,
      labelFont = if (is.null(labelFont)) font else labelFont,
      labelHeight = if (is.null(labelHeight)) 12 else labelHeight,
      bgcol = bgcol,
      opacity = opacity,
      axisCol = axisCol,
      width = width,
      height = height
    )
  )
}
