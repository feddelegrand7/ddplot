#' Create an interactive time series line chart
#'
#' Draws one or several time series as lines, with the interactions that
#' people who work with time series expect: a crosshair tooltip that shows
#' every series at the hovered date, a clickable legend, direct labels at the
#' end of each line, range buttons (1M, 6M, YTD, 1Y, ...), a navigator with a
#' brush under the chart, drag-to-zoom and double-click to reset. The y axis
#' rescales to the data in view whenever you zoom.
#'
#' Series can be given in three ways:
#' \itemize{
#'   \item \strong{one column}: \code{y = "value"};
#'   \item \strong{wide data}: several columns, \code{y = c("a", "b", "c")};
#'   \item \strong{long data}: one value column and a \code{group} column that
#'   names the series.
#' }
#' A \code{ts} or \code{mts} object (for example \code{AirPassengers} or
#' \code{EuStockMarkets}) can also be passed directly as \code{data}, in which
#' case \code{x} and \code{y} are not needed. Monthly, quarterly and yearly
#' series get exact calendar dates; for other frequencies (for example the
#' 260 trading days a year of \code{EuStockMarkets}) the dates are
#' interpolated from the decimal time index, so pass a data frame with a real
#' date column when exact dates matter.
#'
#' Time-series extras: \code{transform = "index"} rebases every series to 100
#' at the start of the visible range (or \code{"percent"} for the change since
#' then), \code{roll_mean} overlays a moving average, \code{lower} /
#' \code{upper} draw a confidence or forecast ribbon, \code{bands} shade
#' periods such as recessions, \code{events} mark dates with a vertical line
#' and \code{h_lines} draw reference values.
#'
#' Missing values (\code{NA}) leave a gap in the line.
#'
#' @param data A data frame, or a \code{ts} / \code{mts} object.
#' @param x The time variable. Can be a \code{Date}, a \code{POSIXct}
#'   date-time, a character column in "yyyy-mm-dd" format, or a numeric column
#'   (for example years). Not needed when \code{data} is a \code{ts} object.
#' @param y The value variable(s). One column name, or several column names
#'   to draw one line per column (wide data). For a univariate \code{ts}
#'   object, it is the name given to the series (defaults to "value").
#' @param group Optional. For long data, the column whose values name the
#'   series (one line per value). Cannot be combined with several \code{y}
#'   columns.
#' @param lower,upper Optional. Columns holding the lower and upper bounds of
#'   a confidence or forecast interval, drawn as a shaded ribbon around the
#'   line. With several \code{y} columns, give one column per \code{y} column
#'   (use \code{NA} for series without a ribbon).
#' @param colors Optional. Colors of the series. Either an unnamed vector
#'   (recycled in series order) or a vector named by series. Defaults to a
#'   built-in 10-color palette.
#' @param stroke The color of the line when there is a single series. When
#'   \code{NULL} (default), the first palette color is used.
#' @param stroke_width The width of the lines. Defaults to 2.
#' @param curve The line's curve type. A complete list can be found here
#'   <https://github.com/d3/d3-shape#curves>. Defaults to 'curveLinear';
#'   'curveMonotoneX' gives smooth lines that never overshoot the data.
#' @param opacity The opacity of the lines (from 0 to 1). Defaults to 1.
#' @param area Logical. Fill the area under each line with a soft gradient.
#'   Defaults to \code{FALSE}.
#' @param points Logical. Draw a marker on every data point. Defaults to
#'   \code{FALSE}.
#' @param y_scale Either "linear" (default) or "log".
#' @param y_zero Logical. Force the y axis to include 0. When \code{NULL}
#'   (default), 0 is included only when \code{area = TRUE}; otherwise the
#'   axis fits the data in view.
#' @param transform How values are displayed: "none" (default), "index"
#'   (each series rebased to \code{index_base} at the first visible date, so
#'   series on different scales can be compared) or "percent" (change since
#'   the first visible date). The base moves with the zoom.
#' @param index_base The value series are rebased to when
#'   \code{transform = "index"}. Defaults to 100.
#' @param roll_mean Optional. A window size (number of observations). When
#'   given, a trailing moving average is drawn as the main line.
#' @param show_raw Logical. When \code{roll_mean} is used, also draw the raw
#'   series as a thin faded line. Defaults to \code{TRUE}.
#' @param events Optional. Dates to mark with a vertical line: either a
#'   vector of dates (names are used as labels) or a data frame whose first
#'   column holds the dates and whose second column (optional) holds labels.
#' @param bands Optional. Periods to shade, as a data frame whose first two
#'   columns are the start and end dates. An optional third column holds the
#'   labels and an optional fourth column the fill colors.
#' @param h_lines Optional. Numeric reference values drawn as horizontal
#'   dashed lines (names are used as labels). Only drawn when
#'   \code{transform = "none"}.
#' @param legend Logical. Show the interactive legend (click to hide or show
#'   a series, double-click to isolate it). When \code{NULL} (default), the
#'   legend is shown when there are two series or more.
#' @param end_labels Logical. Label each line at its last visible point. When
#'   \code{NULL} (default), labels are shown when there are two series or
#'   more.
#' @param tooltip Logical. Show the crosshair and the tooltip on hover.
#'   Defaults to \code{TRUE}.
#' @param navigator Logical. Show the navigator (a miniature of the full
#'   series with a brush to select the visible range) under the chart.
#'   Defaults to \code{TRUE}; it is hidden automatically on very short
#'   charts.
#' @param range_buttons Logical. Show range buttons (1M, 6M, YTD, 1Y, 5Y,
#'   All, ...), chosen from the length and frequency of the data. Only used
#'   with dates. Defaults to \code{TRUE}.
#' @param zoom Logical. Drag horizontally on the chart to zoom into a range;
#'   double-click to reset. Defaults to \code{TRUE}.
#' @param animate Logical. Draw the lines in with an animation on first
#'   render. Defaults to \code{TRUE}.
#' @param value_format Optional. A d3-format string for values in the tooltip
#'   (see <https://github.com/d3/d3-format>). Defaults to ",.2~f", or "+.2~\%"
#'   with \code{transform = "percent"}.
#' @param value_prefix,value_suffix Optional. Text placed before and after the
#'   values on the y axis and in the tooltip, for example "$" or " km".
#' @param date_format Optional. A d3-time-format string for the date in the
#'   tooltip (see <https://github.com/d3/d3-time-format>). When \code{NULL}
#'   (default), it is picked from the frequency of the data (yearly,
#'   quarterly, monthly, daily or intraday).
#' @param x_ticks Optional. The approximate number of x-axis ticks.
#' @param y_ticks Optional. The approximate number of y-axis ticks.
#' @param x_title Optional. The title of the x-axis.
#' @param x_title_font_size The font size of the x-axis title. Defaults to 13.
#' @param y_title Optional. The title of the y-axis, shown above the axis.
#' @param y_title_font_size The font size of the y-axis title. Defaults to 13.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 20.
#' @param subtitle Optional. A subtitle shown under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param x_font_size,y_font_size The font size of the axis tick labels. Defaults
#'   to 11.
#' @param font The font family to consider for the titles. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bg_col The background color of the SVG. Defaults to "white".
#' @param grid_col The color of the horizontal grid lines. Defaults to
#'   "#e9e9e9".
#' @param axis_col The color of the axis text, ticks and titles. Defaults to
#'   "#333333".
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An interactive SVG line chart.
#' @export
#'
#' @examples
#' # A ts object can be passed directly
#' line_chart(AirPassengers, y = "passengers", title = "Airline passengers")
#'
#' # The classic data frame interface still works
#' airpassengers <- data.frame(
#'   passengers = as.matrix(AirPassengers),
#'   date = zoo::as.Date(time(AirPassengers))
#' )
#' line_chart(data = airpassengers, x = "date", y = "passengers")
#'
#' # Several series from an mts object, rebased to 100 at the start of the
#' # visible range: zoom with the range buttons or the navigator and the
#' # comparison is recomputed
#' line_chart(
#'   EuStockMarkets,
#'   transform = "index",
#'   title = "European stock indices",
#'   subtitle = "Daily closing prices, rebased to 100"
#' )
#'
#' # Long data with a group column, area fill and shaded recessions
#' library(ggplot2) # for the economics data set
#'
#' recessions <- data.frame(
#'   start = as.Date(c("1969-12-01", "1973-11-01", "1980-01-01", "1981-07-01",
#'                     "1990-07-01", "2001-03-01", "2007-12-01")),
#'   end   = as.Date(c("1970-11-01", "1975-03-01", "1980-07-01", "1982-11-01",
#'                     "1991-03-01", "2001-11-01", "2009-06-01"))
#' )
#'
#' line_chart(
#'   economics,
#'   x = "date",
#'   y = "unemploy",
#'   area = TRUE,
#'   bands = recessions,
#'   value_format = ",.0f",
#'   value_suffix = "k",
#'   title = "US unemployment",
#'   subtitle = "Thousands of persons, recessions shaded"
#' )
#'
#' # A forecast with its prediction interval
#' fit <- HoltWinters(log(AirPassengers))
#' fc <- predict(fit, n.ahead = 24, prediction.interval = TRUE)
#' fc_dates <- zoo::as.Date(time(fc))
#'
#' passengers <- rbind(
#'   data.frame(date = zoo::as.Date(time(AirPassengers)),
#'              value = as.numeric(AirPassengers), lo = NA, hi = NA,
#'              series = "Observed"),
#'   data.frame(date = fc_dates, value = exp(fc[, "fit"]),
#'              lo = exp(fc[, "lwr"]), hi = exp(fc[, "upr"]),
#'              series = "Forecast")
#' )
#'
#' line_chart(
#'   passengers,
#'   x = "date", y = "value", group = "series",
#'   lower = "lo", upper = "hi",
#'   colors = c(Observed = "#4269d0", Forecast = "#ff725c"),
#'   events = c("Forecast starts" = as.Date("1961-01-01")),
#'   value_format = ",.0f",
#'   title = "Airline passengers: Holt-Winters forecast"
#' )
line_chart <- function(
                      data,
                      x = NULL,
                      y = NULL,
                      group = NULL,
                      lower = NULL,
                      upper = NULL,
                      colors = NULL,
                      stroke = NULL,
                      stroke_width = 2,
                      curve = "curveLinear",
                      opacity = 1,
                      area = FALSE,
                      points = FALSE,
                      y_scale = c("linear", "log"),
                      y_zero = NULL,
                      transform = c("none", "index", "percent"),
                      index_base = 100,
                      roll_mean = NULL,
                      show_raw = TRUE,
                      events = NULL,
                      bands = NULL,
                      h_lines = NULL,
                      legend = NULL,
                      end_labels = NULL,
                      tooltip = TRUE,
                      navigator = TRUE,
                      range_buttons = TRUE,
                      zoom = TRUE,
                      animate = TRUE,
                      value_format = NULL,
                      value_prefix = "",
                      value_suffix = "",
                      date_format = NULL,
                      x_ticks = NULL,
                      y_ticks = NULL,
                      x_title = NULL,
                      x_title_font_size = 13,
                      y_title = NULL,
                      y_title_font_size = 13,
                      title = NULL,
                      title_font_size = 20,
                      subtitle = NULL,
                      subtitle_font_size = 13,
                      x_font_size = 11,
                      y_font_size = 11,
                      font = "Verdana, Geneva, Tahoma, sans-serif",
                      bg_col = "white",
                      grid_col = "#e9e9e9",
                      axis_col = "#333333",
                      width = NULL,
                      height = NULL
                      ) {
  do.call(line_widget, as.list(environment()))
}


# Shared builder for line_chart(), area_chart(), stacked_area_chart() and
# area_band(): validates the arguments, reshapes the data to long rows
# (t, s, v, lo, hi) and calls linechart.js. `extra` holds options used only
# by the area charts (stacking, baseline, band styling, ...).
# @noRd
line_widget <- function(
                      data,
                      x = NULL,
                      y = NULL,
                      group = NULL,
                      lower = NULL,
                      upper = NULL,
                      colors = NULL,
                      stroke = NULL,
                      stroke_width = 2,
                      curve = "curveLinear",
                      opacity = 1,
                      area = FALSE,
                      points = FALSE,
                      y_scale = c("linear", "log"),
                      y_zero = NULL,
                      transform = c("none", "index", "percent"),
                      index_base = 100,
                      roll_mean = NULL,
                      show_raw = TRUE,
                      events = NULL,
                      bands = NULL,
                      h_lines = NULL,
                      legend = NULL,
                      end_labels = NULL,
                      tooltip = TRUE,
                      navigator = TRUE,
                      range_buttons = TRUE,
                      zoom = TRUE,
                      animate = TRUE,
                      value_format = NULL,
                      value_prefix = "",
                      value_suffix = "",
                      date_format = NULL,
                      x_ticks = NULL,
                      y_ticks = NULL,
                      x_title = NULL,
                      x_title_font_size = 13,
                      y_title = NULL,
                      y_title_font_size = 13,
                      title = NULL,
                      title_font_size = 20,
                      subtitle = NULL,
                      subtitle_font_size = 13,
                      x_font_size = 11,
                      y_font_size = 11,
                      font = "Verdana, Geneva, Tahoma, sans-serif",
                      bg_col = "white",
                      grid_col = "#e9e9e9",
                      axis_col = "#333333",
                      width = NULL,
                      height = NULL,
                      extra = list()) {

  y_scale <- match.arg(y_scale)
  transform <- match.arg(transform)

  # ---- ts / mts input --------------------------------------------------------
  if (stats::is.ts(data)) {
    ts_obj <- data
    if (!is.null(x)) {
      stop("'x' is not used when 'data' is a ts object")
    }
    data <- ts_to_df(ts_obj)
    x <- ".date"
    if (is.null(dim(ts_obj))) {
      series_name <- if (is.null(y)) "value" else y
      if (length(series_name) != 1) {
        stop("for a univariate ts object, 'y' must be a single series name")
      }
      names(data)[names(data) == ".value"] <- series_name
      y <- series_name
    } else if (is.null(y)) {
      y <- setdiff(names(data), ".date")
    }
  }

  if (!is.data.frame(data)) {
    stop("'data' must be a data frame or a ts object")
  }
  if (is.null(x) || !is.character(x) || length(x) != 1) {
    stop("'x' must be a single column name")
  }
  if (is.null(y) || !is.character(y) || length(y) < 1) {
    stop("'y' must be one or several column names")
  }
  if (anyDuplicated(y)) {
    stop("'y' contains duplicated column names")
  }
  needed <- c(x, y, group, lower, upper)
  needed <- needed[!is.na(needed)]
  missing_cols <- setdiff(needed, names(data))
  if (length(missing_cols)) {
    stop(
      "Please check that x and y belong to the specified data frame. ",
      "Column(s) not found: ", paste(missing_cols, collapse = ", ")
    )
  }
  for (col in y) {
    if (!is.numeric(data[[col]])) {
      stop("Column '", col, "' must be numeric")
    }
  }
  if (!is.null(group) && length(y) > 1) {
    stop("use either several 'y' columns (wide data) or 'group' (long data), not both")
  }
  if (!is.null(group) && (!is.character(group) || length(group) != 1)) {
    stop("'group' must be a single column name")
  }
  if (xor(is.null(lower), is.null(upper))) {
    stop("'lower' and 'upper' must be given together")
  }
  if (!is.null(lower)) {
    if (length(lower) != length(y) || length(upper) != length(y)) {
      stop("'lower' and 'upper' must have one column per 'y' column")
    }
    for (col in c(lower, upper)) {
      if (!is.na(col) && !is.numeric(data[[col]])) {
        stop("Column '", col, "' must be numeric")
      }
    }
  }
  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  if (!is.numeric(stroke_width) || length(stroke_width) != 1 || stroke_width <= 0) {
    stop("'stroke_width' must be a single positive number")
  }
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a single number between 0 and 1")
  }
  if (!is.null(roll_mean)) {
    if (!is.numeric(roll_mean) || length(roll_mean) != 1 || roll_mean < 2) {
      stop("'roll_mean' must be a single number of observations, 2 or more")
    }
    roll_mean <- as.integer(round(roll_mean))
  }
  if (!is.numeric(index_base) || length(index_base) != 1 || index_base <= 0) {
    stop("'index_base' must be a single positive number")
  }
  for (arg in c("area", "points", "show_raw", "tooltip", "navigator",
                "range_buttons", "zoom", "animate")) {
    val <- get(arg)
    if (!is.logical(val) || length(val) != 1 || is.na(val)) {
      stop("'", arg, "' must be TRUE or FALSE")
    }
  }
  for (arg in c("y_zero", "legend", "end_labels")) {
    val <- get(arg)
    if (!is.null(val) && (!is.logical(val) || length(val) != 1 || is.na(val))) {
      stop("'", arg, "' must be TRUE, FALSE or NULL")
    }
  }

  # ---- time variable ---------------------------------------------------------
  xt <- encode_time(data[[x]], x)
  x_type <- xt$type

  # ---- reshape to long: t, s, v, lo, hi --------------------------------------
  if (!is.null(group)) {
    grp <- data[[group]]
    lev <- if (is.factor(grp)) levels(droplevels(grp)) else unique(as.character(grp[!is.na(grp)]))
    long <- data.frame(
      t  = xt$value,
      s  = as.character(grp),
      v  = data[[y]],
      lo = if (is.null(lower) || is.na(lower)) NA_real_ else data[[lower]],
      hi = if (is.null(upper) || is.na(upper)) NA_real_ else data[[upper]],
      stringsAsFactors = FALSE
    )
    long <- long[!is.na(long$s), , drop = FALSE]
    series <- lev
  } else {
    pieces <- lapply(seq_along(y), function(i) {
      lo_col <- if (is.null(lower)) NA else lower[i]
      hi_col <- if (is.null(upper)) NA else upper[i]
      data.frame(
        t  = xt$value,
        s  = y[i],
        v  = data[[y[i]]],
        lo = if (is.na(lo_col)) NA_real_ else data[[lo_col]],
        hi = if (is.na(hi_col)) NA_real_ else data[[hi_col]],
        stringsAsFactors = FALSE
      )
    })
    long <- do.call(rbind, pieces)
    series <- y
  }

  long <- long[!is.na(long$t), , drop = FALSE]
  if (!nrow(long) || all(is.na(c(long$v, long$lo, long$hi)))) {
    stop("there is no non-missing value to plot")
  }
  long <- long[order(match(long$s, series), xt$order_key(long$t)), , drop = FALSE]
  long$v[!is.finite(long$v)] <- NA
  long$lo[!is.finite(long$lo)] <- NA
  long$hi[!is.finite(long$hi)] <- NA

  if (y_scale == "log" && transform == "none" &&
      any(c(long$v, long$lo, long$hi) <= 0, na.rm = TRUE)) {
    stop("a log scale needs strictly positive values")
  }

  # ---- colors ----------------------------------------------------------------
  series_colors <- NULL
  if (!is.null(colors)) {
    if (!is.character(colors)) stop("'colors' must be a character vector")
    if (!is.null(names(colors)) && all(names(colors) != "")) {
      series_colors <- unname(colors[series])
      series_colors[is.na(series_colors)] <- "#9498a0"
    } else {
      series_colors <- rep_len(colors, length(series))
    }
  } else if (length(series) == 1 && !is.null(stroke)) {
    series_colors <- stroke
  }

  # ---- annotations -----------------------------------------------------------
  events_list <- NULL
  if (!is.null(events)) {
    if (is.data.frame(events)) {
      ev_t <- events[[1]]
      ev_lab <- if (ncol(events) >= 2) as.character(events[[2]]) else rep("", nrow(events))
    } else {
      ev_t <- events
      ev_lab <- if (is.null(names(events))) rep("", length(events)) else names(events)
    }
    ev_t <- encode_time(ev_t, "events", like = x_type)$value
    events_list <- lapply(seq_along(ev_t), function(i) {
      list(t = ev_t[i], label = ifelse(is.na(ev_lab[i]), "", ev_lab[i]))
    })
  }

  bands_list <- NULL
  if (!is.null(bands)) {
    if (!is.data.frame(bands) || ncol(bands) < 2) {
      stop("'bands' must be a data frame whose first two columns are the start and end dates")
    }
    b0 <- encode_time(bands[[1]], "bands", like = x_type)$value
    b1 <- encode_time(bands[[2]], "bands", like = x_type)$value
    b_lab <- if (ncol(bands) >= 3) as.character(bands[[3]]) else rep("", nrow(bands))
    b_col <- if (ncol(bands) >= 4) as.character(bands[[4]]) else rep("", nrow(bands))
    bands_list <- lapply(seq_len(nrow(bands)), function(i) {
      list(t0 = b0[i], t1 = b1[i],
           label = ifelse(is.na(b_lab[i]), "", b_lab[i]),
           color = ifelse(is.na(b_col[i]), "", b_col[i]))
    })
  }

  hlines_list <- NULL
  if (!is.null(h_lines)) {
    if (!is.numeric(h_lines)) stop("'h_lines' must be a numeric vector")
    h_lab <- if (is.null(names(h_lines))) rep("", length(h_lines)) else names(h_lines)
    hlines_list <- lapply(seq_along(h_lines), function(i) {
      list(value = unname(h_lines[i]), label = h_lab[i])
    })
  }

  r2d3::r2d3(
    data = long,
    script = ddplot_script("linechart.js"),
    options = c(list(
      xType = x_type,
      series = as.list(series),
      colors = if (is.null(series_colors)) NULL else as.list(series_colors),
      curve = curve,
      strokeWidth = stroke_width,
      opacity = opacity,
      area = area,
      points = points,
      yScale = y_scale,
      yZero = if (is.null(y_zero)) area else y_zero,
      transform = transform,
      indexBase = index_base,
      rollmean = roll_mean,
      showRaw = show_raw,
      events = events_list,
      bands = bands_list,
      hlines = hlines_list,
      legend = if (is.null(legend)) length(series) > 1 else legend,
      endLabels = if (is.null(end_labels)) length(series) > 1 else end_labels,
      tooltip = tooltip,
      navigator = navigator,
      rangeButtons = range_buttons,
      zoom = zoom,
      animate = animate,
      valueFormat = value_format,
      valuePrefix = value_prefix,
      valueSuffix = value_suffix,
      dateFormat = date_format,
      xticks = x_ticks,
      yticks = y_ticks,
      xtitle = x_title,
      xtitleFontSize = x_title_font_size,
      ytitle = y_title,
      ytitleFontSize = y_title_font_size,
      title = title,
      titleFontSize = title_font_size,
      subtitle = subtitle,
      subtitleFontSize = subtitle_font_size,
      xFontSize = x_font_size,
      yFontSize = y_font_size,
      font = font,
      bgcol = bg_col,
      gridCol = grid_col,
      axisCol = axis_col
    ), extra),
    width = width,
    height = height
  )
}


# Convert a ts / mts object to a data frame with a Date column `.date`.
# Monthly, quarterly and yearly series get calendar dates (1st of the period);
# other frequencies are mapped from the decimal year.
# @noRd
ts_to_df <- function(obj) {
  tt <- as.numeric(stats::time(obj))
  freq <- stats::frequency(obj)
  yr <- floor(tt + 1e-8)
  if (freq %in% c(1, 4, 12)) {
    month <- round((tt - yr) * 12) + 1
    dates <- as.Date(sprintf("%04d-%02d-01", as.integer(yr), as.integer(month)))
  } else {
    start_of_year <- as.Date(sprintf("%04d-01-01", as.integer(yr)))
    days_in_year <- as.numeric(as.Date(sprintf("%04d-01-01", as.integer(yr) + 1L)) - start_of_year)
    dates <- start_of_year + round((tt - yr) * days_in_year)
  }
  mat <- as.matrix(obj)
  out <- data.frame(.date = dates)
  if (is.null(dim(obj))) {
    out$.value <- as.numeric(obj)
  } else {
    nm <- colnames(obj)
    if (is.null(nm)) nm <- paste0("Series ", seq_len(ncol(mat)))
    for (j in seq_len(ncol(mat))) out[[nm[j]]] <- as.numeric(mat[, j])
  }
  out
}


# Encode a time vector for the browser.
# Returns list(type, value, order_key): type is "date", "datetime" or
# "number"; value is what is sent as JSON (ISO strings or numbers).
# `like` forces the encoding of annotation dates to match the main x axis.
# @noRd
encode_time <- function(v, what, like = NULL) {
  if (is.factor(v)) v <- as.character(v)
  type <- if (inherits(v, "POSIXt")) {
    "datetime"
  } else if (inherits(v, "Date")) {
    "date"
  } else if (is.numeric(v)) {
    "number"
  } else if (is.character(v)) {
    "character"
  } else {
    stop("'", what, "' must be a Date, a POSIXct date-time, a 'yyyy-mm-dd' string or a number")
  }

  if (type == "character") {
    parsed <- suppressWarnings(as.Date(v, optional = TRUE))
    if (all(is.na(parsed[!is.na(v)])) || any(is.na(parsed) & !is.na(v))) {
      parsed_dt <- suppressWarnings(as.POSIXct(v, tz = "UTC", optional = TRUE))
      if (any(is.na(parsed_dt) & !is.na(v))) {
        stop("'", what, "' could not be read as dates: use the 'yyyy-mm-dd' format or a Date column")
      }
      v <- parsed_dt
      type <- "datetime"
    } else {
      v <- parsed
      type <- "date"
    }
  }

  if (!is.null(like)) {
    if (like == "number" && type != "number") {
      stop("'", what, "' must be numeric, like the x variable")
    }
    if (like != "number" && type == "number") {
      stop("'", what, "' must be dates, like the x variable")
    }
    if (like == "datetime" && type == "date") {
      v <- as.POSIXct(format(v), tz = "UTC")
      type <- "datetime"
    }
    if (like == "date" && type == "datetime") type <- "datetime_in_date"
  }

  value <- switch(
    type,
    date = format(v, "%Y-%m-%d"),
    datetime = ,
    datetime_in_date = format(v, "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
    number = as.numeric(v)
  )
  if (type == "datetime_in_date") type <- "date"
  value <- unname(value)
  value[is.na(v)] <- NA

  list(
    type = type,
    value = value,
    order_key = function(val) if (type == "number") as.numeric(val) else as.character(val)
  )
}
