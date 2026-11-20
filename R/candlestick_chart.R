#' Create a candlestick chart
#'
#' Draws the open, high, low and close prices of each period as a candle: the
#' body spans the open and the close (green when the price went up, red when
#' it went down) and the wick spans the low and the high. Volumes can be shown
#' as bars below the prices, and moving averages of the close as lines. The
#' periods are drawn side by side, so days without trading leave no gap.
#'
#' @section Interactions:
#' Move the mouse over the chart: a crosshair follows it and the prices of the
#' period are written at the top. Scroll to zoom in time and drag to pan
#' (\code{zoom}); the price axis fits the visible candles, and a double-click
#' resets the view. The candles appear from left to right when the chart is
#' drawn. Inside Shiny, clicking a candle sets \code{input$<id>_clicked} to a
#' list with \code{date}, \code{open}, \code{high}, \code{low}, \code{close}
#' and \code{volume}.
#'
#' @param data A data frame with one row per period.
#' @param date The name of the column with the dates (Date, POSIXct or text).
#' @param open,high,low,close The names of the numeric columns with the
#'   prices.
#' @param volume Optional. The name of a numeric column with the volumes.
#' @param moving_average Optional. One or more window lengths (in periods) for
#'   moving averages of the close, such as \code{c(20, 50)}.
#' @param up_col,down_col The colours of the rising and the falling candles.
#'   Default to "#2e9d5b" and "#e5484d".
#' @param ma_colors Optional. The colours of the moving averages.
#' @param value_format A d3 format for the prices. Defaults to ",.2f".
#' @param date_format Optional. A d3 time format for the dates, such as
#'   "\%d/\%m/\%Y". Defaults to "\%b \%-d, \%Y" (with the time when the dates
#'   have one).
#' @param y_title Optional. The title of the price axis.
#' @param zoom Logical. Let the viewer zoom and pan in time. Defaults to TRUE.
#' @param hover Logical. Show the crosshair and the prices. Defaults to TRUE.
#' @param animate Logical. Let the candles appear when the chart is drawn.
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
#' # A simulated stock over 120 trading days
#' set.seed(42)
#' days <- seq(as.Date("2025-01-01"), by = "day", length.out = 170)
#' days <- days[!format(days, "%u") %in% c("6", "7")][1:120]
#' close <- 100 * cumprod(1 + rnorm(120, 0.001, 0.018))
#' open <- c(100, head(close, -1)) * (1 + rnorm(120, 0, 0.004))
#' stock <- data.frame(
#'   day = days,
#'   open = open,
#'   high = pmax(open, close) * (1 + abs(rnorm(120, 0, 0.008))),
#'   low = pmin(open, close) * (1 - abs(rnorm(120, 0, 0.008))),
#'   close = close,
#'   volume = round(rlnorm(120, 13, 0.4))
#' )
#' candlestick_chart(stock, date = "day", open = "open", high = "high",
#'                   low = "low", close = "close", volume = "volume",
#'                   moving_average = c(10, 30), value_format = "$,.2f",
#'                   title = "A simulated stock")
#'
#' candlestick_chart(tail(stock, 40), date = "day", open = "open", high = "high",
#'                   low = "low", close = "close",
#'                   up_col = "#4269d0", down_col = "#ff725c")
#'
#' @export
candlestick_chart <- function(
    data,
    date,
    open,
    high,
    low,
    close,
    volume = NULL,
    moving_average = NULL,
    up_col = "#2e9d5b",
    down_col = "#e5484d",
    ma_colors = NULL,
    value_format = ",.2f",
    date_format = NULL,
    y_title = NULL,
    zoom = TRUE,
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
  ck_col(data, date, "date")
  for (a in c("open", "high", "low", "close")) ck_col(data, get(a), a, numeric = TRUE)
  ck_col(data, volume, "volume", numeric = TRUE, null_ok = TRUE)
  for (a in c("zoom", "hover", "animate")) ck_flag(get(a), a)
  ck_string(value_format, "value_format", null_ok = FALSE)
  ck_string(date_format, "date_format")
  font <- ck_font(font)
  if (!is.null(moving_average) && (!is.numeric(moving_average) || any(moving_average < 2) || anyNA(moving_average))) {
    stop("'moving_average' must be window lengths of at least 2")
  }

  t <- ck_time(data[[date]], date)
  d <- data.frame(t = t, o = data[[open]], h = data[[high]], l = data[[low]], c = data[[close]])
  if (!is.null(volume)) d$v <- as.numeric(data[[volume]])
  keep <- is.finite(d$t) & is.finite(d$o) & is.finite(d$h) & is.finite(d$l) & is.finite(d$c)
  d <- d[keep, , drop = FALSE]
  if (nrow(d) == 0) stop("'data' has no complete rows")
  d <- d[order(d$t), , drop = FALSE]
  d$h <- pmax(d$h, d$o, d$c)
  d$l <- pmin(d$l, d$o, d$c)
  mas <- NULL
  if (!is.null(moving_average)) {
    moving_average <- as.integer(moving_average)
    mas <- lapply(moving_average, function(k) {
      m <- as.numeric(stats::filter(d$c, rep(1 / k, k), sides = 1))
      list(k = k, v = as.list(ifelse(is.finite(m), m, NA)))
    })
  }
  if (is.null(ma_colors)) ma_colors <- c("#efb118", "#a463f2", "#4269d0", "#ff8ab7")
  if (!is.null(mas)) ma_colors <- rep_len(ma_colors, length(mas))

  r2d3::r2d3(
    data = d,
    script = chart_script("candlestickchart.js"),
    width = width,
    height = height,
    options = list(
      hasVolume = !is.null(volume),
      day = ck_is_day(data[[date]]),
      mas = mas,
      upCol = up_col,
      downCol = down_col,
      maColors = as.list(ma_colors),
      valueFormat = value_format,
      dateFormat = date_format,
      ytitle = y_title,
      zoom = zoom,
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
