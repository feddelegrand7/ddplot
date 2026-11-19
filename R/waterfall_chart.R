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
#' @param positive_color Fill color for bars representing an increase.
#' Defaults to \code{"#4CAF50"}.
#' @param negative_color Fill color for bars representing a decrease.
#' Defaults to \code{"#F44336"}.
#' @param total_color Fill color for \code{"total"} measure bars.
#' Defaults to \code{"#5C85D6"}.
#' @param connector Logical. Whether to draw dashed connector lines between
#' consecutive bars. Defaults to \code{TRUE}.
#' @param connector_color Color of the connector lines. Defaults to
#' \code{"#aaaaaa"}.
#' @param show_labels Logical. Whether to display the delta value above or
#' below each bar. Defaults to \code{TRUE}.
#' @param label_font_size Font size of the bar value labels. Defaults to
#' \code{10}.
#' @param title Optional. Title of the chart.
#' @param title_font_size Font size of the chart title. Defaults to \code{16}.
#' @param xtitle Optional. Title of the x-axis.
#' @param xtitle_font_size Font size of the x-axis title. Defaults to \code{13}.
#' @param ytitle Optional. Title of the y-axis.
#' @param ytitle_font_size Font size of the y-axis title. Defaults to \code{13}.
#' @param x_font_size Font size of the x-axis tick labels. Defaults to \code{11}.
#' @param y_font_size Font size of the y-axis tick labels. Defaults to \code{11}.
#' @param opacity Opacity of the bars (0 to 1). Defaults to \code{1}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axis_col Color of axis lines, ticks, and labels. Defaults to
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
#'   positive_color  = "steelblue",
#'   negative_color  = "tomato"
#' )
waterfall_chart <- function(
    data,
    x,
    y,
    measure        = NULL,
    positive_color  = "#4CAF50",
    negative_color  = "#F44336",
    total_color     = "#5C85D6",
    connector      = TRUE,
    connector_color = "#aaaaaa",
    show_labels     = TRUE,
    label_font_size  = 10,
    title          = NULL,
    title_font_size  = 16,
    xtitle         = NULL,
    xtitle_font_size = 13,
    ytitle         = NULL,
    ytitle_font_size = 13,
    x_font_size      = 11,
    y_font_size      = 11,
    opacity        = 1,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    axis_col        = "black",
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
    script = ddplot_script("waterfallchart.js"),
    options = list(
      x              = x,
      y              = y,
      measure        = measure,
      positiveColor  = positive_color,
      negativeColor  = negative_color,
      totalColor     = total_color,
      connector      = connector,
      connectorColor = connector_color,
      showLabels     = show_labels,
      labelFontSize  = label_font_size,
      title          = title,
      titleFontSize  = title_font_size,
      xtitle         = xtitle,
      xtitleFontSize = xtitle_font_size,
      ytitle         = ytitle,
      ytitleFontSize = ytitle_font_size,
      xFontSize      = x_font_size,
      yFontSize      = y_font_size,
      opacity        = opacity,
      font           = font,
      bgcol          = bgcol,
      axisCol        = axis_col
    ),
    width  = width,
    height = height
  )
}
