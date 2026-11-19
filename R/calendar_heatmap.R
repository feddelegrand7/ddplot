#' Create a calendar heatmap.
#'
#' @description
#' A calendar heatmap lays out one rounded square per day on a grid where
#' each column is a week and each row is a day of the week, so a whole year
#' fits in a single compact band. Each square is colored by the value
#' recorded on that day using a sequential palette, which makes weekly
#' rhythms, seasonal patterns, streaks and gaps easy to spot. The layout was
#' popularised by GitHub's contribution graph and is the signature chart of
#' the Frappe Charts library.
#'
#' Month labels are drawn above the grid, weekday labels on its left, and a
#' "Less ... More" legend underneath. When the data span several years, one
#' panel is stacked per year. Days without data (and, when all values are
#' non-negative, days with a value of zero) are drawn in \code{empty_col}.
#' Hovering over a day shows a tooltip with its value and date, and hovering
#' over a legend square highlights the days that fall in that color bucket.
#'
#' @param data The data frame containing the variables to consider.
#' @param date The name of the column holding the dates. It can be of class
#' \code{Date}, \code{POSIXct} or a character vector in \code{"YYYY-MM-DD"}
#' format.
#' @param value Optional. The name of the numeric column holding the value of
#' each day. When \code{NULL} (default), the number of rows per day is used,
#' which is handy for event logs (one row per event).
#' @param aggregate How to combine several rows that share the same date. One
#' of \code{"sum"} (default), \code{"mean"}, \code{"max"}, \code{"min"} or
#' \code{"count"}. Ignored (always \code{"count"}) when \code{value} is
#' \code{NULL}.
#' @param week_start The first day of the week, i.e. the top row of the grid.
#' Either \code{"sunday"} (default) or \code{"monday"}.
#' @param colors A vector of colors, from low to high, used to fill days that
#' have a value. Values are split into \code{length(colors)} equal-width
#' buckets. Defaults to a Frappe-like blue ramp
#' \code{c("#c0ddf9", "#73b3f3", "#3886e1", "#17459e")}.
#' @param empty_col Fill color of days without data (or with a value of zero
#' when all values are non-negative). Defaults to \code{"#ebedf0"}.
#' @param cell_radius Corner radius of the day squares in pixels. Defaults to
#' \code{2}.
#' @param cell_gap Gap between day squares in pixels. Defaults to \code{3}.
#' @param value_label Optional. The unit shown after the value in the tooltip
#' and year totals (e.g. \code{"commits"}). Defaults to the name of the
#' \code{value} column, or \code{"events"} when \code{value} is \code{NULL}.
#' @param value_format A d3-format specifier used to display values (e.g.
#' \code{",.0f"}, \code{"$,.2s"}). Defaults to \code{",.2~f"}.
#' @param date_format A d3-time-format specifier used to display dates in the
#' tooltip. Defaults to \code{"\%a \%b \%-d, \%Y"} (e.g. "Wed Jan 7, 2026").
#' @param show_year_label Whether to print the year and its total above each
#' panel. Defaults to \code{TRUE}.
#' @param show_month_labels Whether to print month labels above the grid.
#' Defaults to \code{TRUE}.
#' @param show_weekday_labels Whether to print weekday labels (Mon, Wed, Fri) on
#' the left of the grid. Defaults to \code{TRUE}.
#' @param label_font_size Font size of the month, weekday, year and legend
#' labels. Defaults to \code{10}.
#' @param legend Whether to display the "Less ... More" legend. Defaults to
#' \code{TRUE}.
#' @param legend_labels A character vector of length 2 giving the text drawn
#' on each side of the legend. Defaults to \code{c("Less", "More")}.
#' @param hover Whether to highlight the hovered day and show a tooltip.
#' Defaults to \code{TRUE}.
#' @param animate Whether the day squares fade in with a staggered animation
#' on first render. Defaults to \code{TRUE}.
#' @param title Optional. Title of the chart.
#' @param title_font_size Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bg_col Background color of the SVG. Defaults to \code{"white"}.
#' @param axis_col Color of the title and of the month, weekday, year and
#' legend labels. Defaults to \code{"#555555"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output. Defaults to a height
#' that fits the number of years displayed.
#'
#' @return An SVG calendar heatmap.
#' @export
#'
#' @examples
#' # One year of simulated daily activity, busier on weekdays
#' set.seed(2026)
#' days <- seq(as.Date("2026-01-01"), as.Date("2026-12-31"), by = "day")
#' weekday <- !(format(days, "%u") %in% c("6", "7"))
#' activity <- data.frame(
#'   day     = days,
#'   commits = rpois(length(days), lambda = ifelse(weekday, 6, 1.5)) *
#'             rbinom(length(days), 1, 0.8)
#' )
#'
#' calendar_heatmap(
#'   data       = activity,
#'   date       = "day",
#'   value      = "commits",
#'   title      = "Commits in 2026"
#' )
#'
#' # Several years stacked, weeks starting on Monday, GitHub-like greens
#' set.seed(1)
#' days <- seq(as.Date("2021-01-01"), as.Date("2023-12-31"), by = "day")
#' season <- 10 + 8 * sin(2 * pi * as.numeric(format(days, "%j")) / 365)
#' rainfall <- data.frame(day = days, rain = pmax(0, rnorm(length(days), season, 6)))
#'
#' calendar_heatmap(
#'   data        = rainfall,
#'   date        = "day",
#'   value       = "rain",
#'   week_start   = "monday",
#'   colors      = c("#9be9a8", "#40c463", "#30a14e", "#216e39"),
#'   value_label  = "mm of rain",
#'   value_format = ",.1f",
#'   title       = "Daily rainfall, 2021-2023"
#' )
#'
#' # Event log: one row per event, counted per day
#' set.seed(7)
#' events <- data.frame(
#'   when = as.Date("2025-01-01") + sample(0:364, 900, replace = TRUE)
#' )
#'
#' calendar_heatmap(
#'   data       = events,
#'   date       = "when",
#'   value_label = "orders",
#'   colors     = c("#fde0c5", "#facba6", "#f59e72", "#e8603c", "#c0392b"),
#'   empty_col   = "#f2f2f2",
#'   cell_radius = 3,
#'   title      = "Orders per day"
#' )
calendar_heatmap <- function(
    data,
    date,
    value             = NULL,
    aggregate         = c("sum", "mean", "max", "min", "count"),
    week_start         = c("sunday", "monday"),
    colors            = c("#c0ddf9", "#73b3f3", "#3886e1", "#17459e"),
    empty_col          = "#ebedf0",
    cell_radius        = 2,
    cell_gap           = 3,
    value_label        = NULL,
    value_format       = ",.2~f",
    date_format        = "%a %b %-d, %Y",
    show_year_label     = TRUE,
    show_month_labels   = TRUE,
    show_weekday_labels = TRUE,
    label_font_size     = 10,
    legend            = TRUE,
    legend_labels      = c("Less", "More"),
    hover             = TRUE,
    animate           = TRUE,
    title             = NULL,
    title_font_size     = 16,
    font              = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col             = "white",
    axis_col           = "#555555",
    width             = NULL,
    height            = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")

  if (!is.character(date) || length(date) != 1) {
    stop("'date' must be a single column name.")
  }
  if (is.null(data[[date]])) stop("Column '", date, "' not found in data.")

  if (!is.null(value)) {
    if (!is.character(value) || length(value) != 1) {
      stop("'value' must be NULL or a single column name.")
    }
    if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")
    if (!is.numeric(data[[value]])) stop("Column '", value, "' must be numeric.")
  }

  aggregate <- match.arg(aggregate)
  week_start <- match.arg(week_start)

  # Convert the date column to Date
  raw_dates <- data[[date]]
  dates <- if (inherits(raw_dates, "Date")) {
    raw_dates
  } else if (inherits(raw_dates, "POSIXt")) {
    as.Date(format(raw_dates, "%Y-%m-%d"))
  } else if (is.character(raw_dates) || is.factor(raw_dates)) {
    as.Date(as.character(raw_dates), format = "%Y-%m-%d")
  } else {
    stop("Column '", date, "' must be of class Date, POSIXct, or a ",
         "character vector in 'YYYY-MM-DD' format.")
  }

  if (all(is.na(dates))) {
    stop("Column '", date, "' could not be converted to dates. Use class ",
         "Date, POSIXct, or 'YYYY-MM-DD' strings.")
  }

  values <- if (is.null(value)) rep(1, length(dates)) else data[[value]]
  if (is.null(value)) aggregate <- "count"

  keep <- !is.na(dates) & (aggregate == "count" | is.finite(values))
  if (sum(!is.na(dates)) < length(dates)) {
    warning(sum(is.na(dates)), " row(s) with a missing or invalid date ",
            "were dropped.")
  }
  if (!any(keep)) stop("No rows with a valid date and a finite value.")

  dates  <- dates[keep]
  values <- values[keep]

  agg_fun <- switch(
    aggregate,
    sum   = sum,
    mean  = mean,
    max   = max,
    min   = min,
    count = length
  )
  agg <- tapply(values, as.character(dates), agg_fun)
  daily <- data.frame(
    date  = names(agg),
    value = as.numeric(agg),
    stringsAsFactors = FALSE
  )

  if (!is.character(colors) || length(colors) < 1) {
    stop("'colors' must be a character vector of at least one color.")
  }
  if (!is.character(empty_col) || length(empty_col) != 1) {
    stop("'empty_col' must be a single color.")
  }
  if (!is.numeric(cell_radius) || length(cell_radius) != 1 || cell_radius < 0) {
    stop("'cell_radius' must be a single non-negative number.")
  }
  if (!is.numeric(cell_gap) || length(cell_gap) != 1 || cell_gap < 0) {
    stop("'cell_gap' must be a single non-negative number.")
  }
  if (!is.character(legend_labels) || length(legend_labels) != 2) {
    stop("'legend_labels' must be a character vector of length 2.")
  }
  if (!is.character(value_format) || length(value_format) != 1) {
    stop("'value_format' must be a single d3-format string, e.g. ',.0f'.")
  }
  if (!is.character(date_format) || length(date_format) != 1) {
    stop("'date_format' must be a single d3-time-format string.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(value_label)) {
    value_label <- if (is.null(value)) "events" else value
  }

  # Default height: fits the stacked year panels
  if (is.null(height)) {
    years <- as.integer(format(range(dates), "%Y"))
    n_years <- years[2] - years[1] + 1
    height <- (if (!is.null(title)) title_font_size + 18 else 0) +
      n_years * 160 + (if (legend) 34 else 6)
  }

  r2d3::r2d3(
    data   = daily,
    script = ddplot_script("calendarheatmap.js"),
    options = list(
      weekStart         = week_start,
      colors            = as.list(colors),
      emptyCol          = empty_col,
      cellRadius        = cell_radius,
      cellGap           = cell_gap,
      valueLabel        = value_label,
      valueFormat       = value_format,
      dateFormat        = date_format,
      showYearLabel     = show_year_label,
      showMonthLabels   = show_month_labels,
      showWeekdayLabels = show_weekday_labels,
      labelFontSize     = label_font_size,
      legend            = legend,
      legendLabels      = as.list(legend_labels),
      hover             = hover,
      animate           = animate,
      title             = title,
      titleFontSize     = title_font_size,
      font              = font,
      bgcol             = bg_col,
      axisCol           = axis_col
    ),
    width  = width,
    height = height
  )
}
