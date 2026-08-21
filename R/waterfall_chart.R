#' Create an interactive waterfall chart.
#'
#' @description
#' A waterfall chart shows how an initial value is built up or eroded by a
#' series of positive and negative contributions to reach a final total.
#' Each bar starts exactly where the previous one ended, making cumulative
#' effects immediately visible. It is the standard chart for P&L
#' decomposition, budget variance analysis, and any "what changed and why"
#' narrative.
#'
#' Hovering over a bar shows a tooltip with the label, the delta value, and
#' the running total at that point.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The name of the column containing category labels.
#' @param y The name of the column containing the delta values (positive for
#' increases, negative for decreases).
#' @param measure Optional. The name of a column that classifies each row as
#' \code{"relative"} (default — a delta added to the running total) or
#' \code{"total"} (a bar spanning from zero to the current running total,
#' used for subtotals and the final total).
#' @param positiveColor Fill color for bars representing an increase.
#' Defaults to \code{"#4CAF50"}.
#' @param negativeColor Fill color for bars representing a decrease.
#' Defaults to \code{"#F44336"}.
#' @param totalColor Fill color for \code{"total"} measure bars.
#' Defaults to \code{"#5C85D6"}.
#' @param connector Logical. Whether to draw dashed connector lines between
#' consecutive bars. Defaults to \code{TRUE}.
#' @param connectorColor Color of the connector lines. Defaults to
#' \code{"#aaaaaa"}.
#' @param showLabels Logical. Whether to display the delta value above or
#' below each bar. Defaults to \code{TRUE}.
#' @param labelFontSize Font size of the bar value labels. Defaults to
#' \code{10}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param xtitle Optional. Title of the x-axis.
#' @param xtitleFontSize Font size of the x-axis title. Defaults to \code{13}.
#' @param ytitle Optional. Title of the y-axis.
#' @param ytitleFontSize Font size of the y-axis title. Defaults to \code{13}.
#' @param xFontSize Font size of the x-axis tick labels. Defaults to \code{11}.
#' @param yFontSize Font size of the y-axis tick labels. Defaults to \code{11}.
#' @param opacity Opacity of the bars (0 to 1). Defaults to \code{1}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axisCol Color of axis lines, ticks, and labels. Defaults to
#' \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An interactive SVG waterfall chart.
#' @export
#'
#' @examples
#' # P&L bridge: from revenue down to net income
#' pnl <- data.frame(
#'   label   = c("Revenue", "COGS", "Gross Profit",
#'               "R&D", "S&M", "G&A", "Operating Income"),
#'   value   = c(1200, -450, 750, -120, -90, -60, 480),
#'   measure = c("relative", "relative", "total",
#'               "relative", "relative", "relative", "total")
#' )
#'
#' waterfall_chart(
#'   data    = pnl,
#'   x       = "label",
#'   y       = "value",
#'   measure = "measure",
#'   title   = "P&L bridge",
#'   ytitle  = "USD thousands"
#' )
#'
#' # Monthly cash flow
#' cashflow <- data.frame(
#'   month = c("Jan", "Feb", "Mar", "Apr", "May", "Jun"),
#'   delta = c(120, -30, 80, -60, 95, -20)
#' )
#'
#' waterfall_chart(
#'   data           = cashflow,
#'   x              = "month",
#'   y              = "delta",
#'   title          = "Monthly cash flow",
#'   ytitle         = "USD thousands",
#'   positiveColor  = "steelblue",
#'   negativeColor  = "tomato"
#' )
waterfall_chart <- function(
    data,
    x,
    y,
    measure        = NULL,
    positiveColor  = "#4CAF50",
    negativeColor  = "#F44336",
    totalColor     = "#5C85D6",
    connector      = TRUE,
    connectorColor = "#aaaaaa",
    showLabels     = TRUE,
    labelFontSize  = 10,
    title          = NULL,
    titleFontSize  = 16,
    xtitle         = NULL,
    xtitleFontSize = 13,
    ytitle         = NULL,
    ytitleFontSize = 13,
    xFontSize      = 11,
    yFontSize      = 11,
    opacity        = 1,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    axisCol        = "black",
    width          = NULL,
    height         = NULL
) {

  if (is.null(data[[x]])) stop("Column '", x, "' not found in data.")
  if (is.null(data[[y]])) stop("Column '", y, "' not found in data.")
  if (!is.numeric(data[[y]])) stop("Column '", y, "' must be numeric.")

  if (!is.null(measure) && is.null(data[[measure]])) {
    stop("Column '", measure, "' not found in data.")
  }

  if (!is.null(measure)) {
    allowed <- c("relative", "total")
    bad <- setdiff(unique(data[[measure]]), allowed)
    if (length(bad) > 0) {
      stop("'measure' column may only contain 'relative' or 'total'. Found: ",
           paste(bad, collapse = ", "))
    }
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data   = data,
    script = system.file("d3/scatterplot/waterfallchart.js", package = "ddplot"),
    options = list(
      x              = x,
      y              = y,
      measure        = measure,
      positiveColor  = positiveColor,
      negativeColor  = negativeColor,
      totalColor     = totalColor,
      connector      = connector,
      connectorColor = connectorColor,
      showLabels     = showLabels,
      labelFontSize  = labelFontSize,
      title          = title,
      titleFontSize  = titleFontSize,
      xtitle         = xtitle,
      xtitleFontSize = xtitleFontSize,
      ytitle         = ytitle,
      ytitleFontSize = ytitleFontSize,
      xFontSize      = xFontSize,
      yFontSize      = yFontSize,
      opacity        = opacity,
      font           = font,
      bgcol          = bgcol,
      axisCol        = axisCol
    ),
    width  = width,
    height = height
  )
}
