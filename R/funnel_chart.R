#' Create a funnel chart
#'
#' Draws the stages of a process (visits, sign-ups, purchases, ...) as
#' centred bars whose width is proportional to their value, from the first
#' stage at the top to the last at the bottom. The conversion from one stage
#' to the next is written between the bars and the share of the first stage
#' on the right.
#'
#' @section Interactions:
#' Hover a stage to see its value, its share of the first stage, the
#' conversion from the previous stage and how many were lost on the way. The
#' bars grow one after the other when the chart is drawn. Inside Shiny,
#' clicking a stage sets \code{input$<id>_clicked} to a list with
#' \code{stage}, \code{value}, \code{percent_of_first} and
#' \code{conversion}.
#'
#' @param data A data frame with one row per stage, in order (or a factor
#'   giving the order). Rows of the same stage are added up.
#' @param stage The name of the column with the stages.
#' @param value The name of the numeric column with the values.
#' @param colors Optional. One colour (the stages get lighter shades of it) or
#'   one colour per stage. Defaults to shades of blue.
#' @param shape \code{"funnel"} (the default) joins the bars with a funnel
#'   shape; \code{"bars"} draws the bars alone.
#' @param show_conversion Logical. Write the conversion from each stage to the
#'   next between the bars. Defaults to TRUE.
#' @param show_percent Logical. Write the share of the first stage on the
#'   right. Defaults to TRUE.
#' @param value_format A d3 format for the values. Defaults to ",.0f".
#' @param label_font_size The font size of the labels. Defaults to 12.
#' @param hover Logical. Show tooltips and highlight on hover. Defaults to TRUE.
#' @param animate Logical. Grow the bars when the chart is drawn. Defaults to
#'   TRUE.
#' @param title Optional. The title of the chart.
#' @param title_font_size The font size of the title. Defaults to 16.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bg_col The background colour. Defaults to "white".
#' @param text_col The colour of the text. Defaults to "#333333".
#' @param width,height Optional. The size of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' shop <- data.frame(
#'   step = c("Visited the site", "Viewed a product", "Added to cart",
#'            "Started checkout", "Paid"),
#'   users = c(12000, 7400, 2900, 1650, 1180)
#' )
#' funnel_chart(shop, stage = "step", value = "users",
#'              title = "Online shop, last 30 days")
#'
#' hiring <- data.frame(
#'   stage = c("Applications", "Screened", "Interviewed", "Offer", "Hired"),
#'   people = c(420, 160, 48, 12, 9)
#' )
#' funnel_chart(hiring, stage = "stage", value = "people", shape = "bars",
#'              colors = "#3ca951")
#'
#' @export
funnel_chart <- function(
    data,
    stage,
    value,
    colors = NULL,
    shape = c("funnel", "bars"),
    show_conversion = TRUE,
    show_percent = TRUE,
    value_format = ",.0f",
    label_font_size = 12,
    hover = TRUE,
    animate = TRUE,
    title = NULL,
    title_font_size = 16,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col = "white",
    text_col = "#333333",
    width = NULL,
    height = NULL
) {
  ck_df(data)
  ck_col(data, stage, "stage")
  ck_col(data, value, "value", numeric = TRUE)
  shape <- match.arg(shape)
  for (a in c("show_conversion", "show_percent", "hover", "animate")) ck_flag(get(a), a)
  ck_string(value_format, "value_format", null_ok = FALSE)
  font <- ck_font(font)
  st <- data[[stage]]
  v <- as.numeric(data[[value]])
  keep <- !is.na(st) & is.finite(v)
  if (any(v[keep] < 0)) stop("Column '", value, "' must not be negative")
  stages <- ck_levels(st[keep])
  vals <- vapply(stages, function(s) sum(v[keep][as.character(st[keep]) == s]), numeric(1))
  if (length(stages) == 0 || max(vals) <= 0) stop("'data' has no positive values")
  if (!is.null(colors) && (!is.character(colors) || !(length(colors) %in% c(1, length(stages))))) {
    stop("'colors' must be one colour or one colour per stage (", length(stages), ")")
  }

  r2d3::r2d3(
    data = data.frame(stage = stages, value = unname(vals)),
    script = chart_script("funnelchart.js"),
    width = width,
    height = height,
    options = list(
      colors = if (is.null(colors)) NULL else as.list(colors),
      shape = shape,
      showConversion = show_conversion,
      showPercent = show_percent,
      valueFormat = value_format,
      labelFontSize = label_font_size,
      hover = hover,
      animate = animate,
      title = title,
      titleFontSize = title_font_size,
      font = font,
      bgcol = bg_col,
      textCol = text_col
    )
  )
}
