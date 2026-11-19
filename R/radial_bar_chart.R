#' Create a radial bar chart.
#'
#' @description
#' A radial bar chart (sometimes called a multi-ring progress chart or
#' "activity rings") draws each category as a concentric circular track. A
#' faint background track shows the full scale, and a colored arc with
#' rounded ends sweeps along it in proportion to the category's value
#' relative to \code{max}. It is a compact way to compare a handful of
#' progress or completion rates. The look is inspired by the radialBar chart
#' of the ApexCharts JavaScript library, reimplemented here in plain D3.
#'
#' The first row of \code{data} is drawn as the outermost ring. The arcs
#' sweep in on load, each ring is labelled at the start of its track, and
#' the center shows the average (or total) of the values. Hovering a ring
#' highlights it, replaces the center text with that ring's name and value,
#' and shows a tooltip.
#'
#' By default the rings cover 270 degrees (\code{start_angle = 0},
#' \code{end_angle = 270}), leaving the top-left quadrant free for the ring
#' labels. Angles are in degrees, measured clockwise from 12 o'clock. Use
#' \code{end_angle = 360} for full circles (labels then follow the curve of
#' each track), or for example \code{start_angle = -90, end_angle = 90} for a
#' semicircle gauge.
#'
#' @param data The data frame containing the variables to consider (one row
#' per ring).
#' @param label The name of the column holding the ring labels.
#' @param value The name of the numeric (non-negative) column holding the
#' ring values.
#' @param max The value that corresponds to a full sweep of the track.
#' Values above \code{max} are capped at a full sweep (with a warning).
#' Defaults to \code{100}.
#' @param start_angle Angle in degrees at which every track starts, measured
#' clockwise from 12 o'clock. Defaults to \code{0}.
#' @param end_angle Angle in degrees at which every track ends. Must be greater
#' than \code{start_angle} and at most \code{start_angle + 360}. Defaults to
#' \code{270}.
#' @param colors Optional. A vector of colors, one per ring (recycled if
#' shorter). Defaults to \code{NULL}, which uses a built-in palette.
#' @param track_col Color of the background tracks. Defaults to
#' \code{"#ececec"}.
#' @param hollow Size of the empty center as a fraction (0 to 0.9) of the
#' outer radius. Defaults to \code{0.35}.
#' @param ring_gap Fraction (0 to 0.9) of each ring's band left empty between
#' neighbouring tracks. Defaults to \code{0.3}.
#' @param rounded_caps Whether the arcs (and partial tracks) have rounded ends.
#' Defaults to \code{TRUE}.
#' @param show_labels Whether to label each ring at the start of its track.
#' Defaults to \code{TRUE}.
#' @param show_values Whether to append the formatted value to each ring
#' label (e.g. \code{"Vimeo: 76\%"}). Defaults to \code{TRUE}.
#' @param label_font_size Font size of the ring labels. Defaults to \code{12}.
#' @param center_value What to show in the center when nothing is hovered:
#' \code{"average"} (default), \code{"total"} or \code{"none"}.
#' @param center_label Optional. Text shown above the center value. Defaults
#' to \code{"Average"} or \code{"Total"} depending on \code{center_value}.
#' @param center_font_size Optional. Font size of the big center value.
#' Defaults to \code{NULL}, which sizes it to fit the hollow.
#' @param value_format A d3-format specifier used to display values. Defaults
#' to \code{",.0f"}.
#' @param suffix Optional. Text appended to every displayed value. Defaults to
#' \code{NULL}, which uses \code{"\%"} when \code{max = 100} and nothing
#' otherwise.
#' @param hover Whether hovering a ring highlights it, updates the center
#' text and shows a tooltip. Defaults to \code{TRUE}.
#' @param animate Whether the arcs sweep in on first render. Defaults to
#' \code{TRUE}.
#' @param duration Duration of the sweep animation in milliseconds. Defaults
#' to \code{1200}.
#' @param title Optional. Title of the chart.
#' @param title_font_size Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bg_col Background color of the SVG. Defaults to \code{"white"}.
#' @param text_col Color of the title, labels and center text. Defaults to
#' \code{"#333333"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG radial bar chart.
#' @export
#'
#' @examples
#' # Share of users active on each platform (percentages)
#' platforms <- data.frame(
#'   platform = c("Vimeo", "Messenger", "Facebook", "LinkedIn"),
#'   share    = c(76, 67, 61, 90)
#' )
#'
#' radial_bar_chart(
#'   data  = platforms,
#'   label = "platform",
#'   value = "share",
#'   title = "Weekly active users (share of total)"
#' )
#'
#' # Full circles, total in the center, custom colors and a custom maximum
#' sales <- data.frame(
#'   region = c("North", "South", "East", "West", "Central"),
#'   units  = c(420, 310, 275, 190, 120)
#' )
#'
#' radial_bar_chart(
#'   data        = sales,
#'   label       = "region",
#'   value       = "units",
#'   max         = 500,
#'   end_angle    = 360,
#'   center_value = "total",
#'   center_label = "Units sold",
#'   colors      = c("#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e"),
#'   title       = "Units sold by region (target: 500)"
#' )
#'
#' # Gauge layout open at the bottom, without values in the ring labels
#' radial_bar_chart(
#'   data       = platforms,
#'   label      = "platform",
#'   value      = "share",
#'   start_angle = -135,
#'   end_angle   = 135,
#'   hollow     = 0.45,
#'   show_values = FALSE,
#'   track_col   = "#f2f2f2"
#' )
radial_bar_chart <- function(
    data,
    label,
    value,
    max            = 100,
    start_angle     = 0,
    end_angle       = 270,
    colors         = NULL,
    track_col       = "#ececec",
    hollow         = 0.35,
    ring_gap        = 0.3,
    rounded_caps    = TRUE,
    show_labels     = TRUE,
    show_values     = TRUE,
    label_font_size  = 12,
    center_value    = c("average", "total", "none"),
    center_label    = NULL,
    center_font_size = NULL,
    value_format    = ",.0f",
    suffix         = NULL,
    hover          = TRUE,
    animate        = TRUE,
    duration       = 1200,
    title          = NULL,
    title_font_size  = 16,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col          = "white",
    text_col        = "#333333",
    width          = NULL,
    height         = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")
  if (nrow(data) == 0) stop("'data' must contain at least one row.")

  if (is.null(data[[label]])) stop("Column '", label, "' not found in data.")
  if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")

  if (!is.numeric(data[[value]])) stop("Column '", value, "' must be numeric.")
  if (any(data[[value]] < 0, na.rm = TRUE)) {
    stop("Column '", value, "' must contain non-negative values only.")
  }

  if (!is.numeric(max) || length(max) != 1 || !is.finite(max) || max <= 0) {
    stop("'max' must be a single positive number.")
  }

  if (any(data[[value]] > max, na.rm = TRUE)) {
    warning("Some values of '", value, "' exceed 'max' (", max,
            "); their arcs are capped at a full sweep.")
  }

  if (!is.numeric(start_angle) || length(start_angle) != 1 ||
      !is.finite(start_angle)) {
    stop("'start_angle' must be a single number (degrees).")
  }
  if (!is.numeric(end_angle) || length(end_angle) != 1 || !is.finite(end_angle)) {
    stop("'end_angle' must be a single number (degrees).")
  }
  if (end_angle <= start_angle) {
    stop("'end_angle' must be greater than 'start_angle'.")
  }
  if (end_angle - start_angle > 360) {
    stop("'end_angle' - 'start_angle' must not exceed 360 degrees.")
  }

  if (!is.numeric(hollow) || length(hollow) != 1 || hollow < 0 || hollow > 0.9) {
    stop("'hollow' must be a single number between 0 and 0.9.")
  }
  if (!is.numeric(ring_gap) || length(ring_gap) != 1 ||
      ring_gap < 0 || ring_gap > 0.9) {
    stop("'ring_gap' must be a single number between 0 and 0.9.")
  }

  if (!is.null(colors) && !is.character(colors)) {
    stop("'colors' must be NULL or a character vector of colors.")
  }

  center_value <- match.arg(center_value)

  if (!is.character(value_format) || length(value_format) != 1) {
    stop("'value_format' must be a single d3-format string, e.g. ',.0f'.")
  }

  if (!is.null(suffix) && (!is.character(suffix) || length(suffix) != 1)) {
    stop("'suffix' must be NULL or a single character string.")
  }

  if (!is.null(center_font_size) &&
      (!is.numeric(center_font_size) || length(center_font_size) != 1 ||
       center_font_size <= 0)) {
    stop("'center_font_size' must be NULL or a single positive number.")
  }

  if (!is.numeric(duration) || length(duration) != 1 || duration < 0) {
    stop("'duration' must be a single non-negative number (milliseconds).")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(suffix)) suffix <- if (max == 100) "%" else ""

  if (is.null(center_label)) {
    center_label <- switch(center_value,
                          average = "Average",
                          total   = "Total",
                          none    = "")
  }

  r2d3::r2d3(
    data   = data.frame(
      label = as.character(data[[label]]),
      value = data[[value]],
      stringsAsFactors = FALSE
    ),
    script = ddplot_script("radialbarchart.js"),
    options = list(
      max            = max,
      startAngle     = start_angle,
      endAngle       = end_angle,
      colors         = if (is.null(colors)) NULL else as.list(colors),
      trackCol       = track_col,
      hollow         = hollow,
      ringGap        = ring_gap,
      roundedCaps    = rounded_caps,
      showLabels     = show_labels,
      showValues     = show_values,
      labelFontSize  = label_font_size,
      centerValue    = center_value,
      centerLabel    = center_label,
      centerFontSize = center_font_size,
      valueFormat    = value_format,
      suffix         = suffix,
      hover          = hover,
      animate        = animate,
      duration       = duration,
      title          = title,
      titleFontSize  = title_font_size,
      font           = font,
      bgcol          = bg_col,
      textCol        = text_col
    ),
    width  = width,
    height = height
  )
}
