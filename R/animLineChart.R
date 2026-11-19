

#' Create an animated line chart
#'
#' @param data The data frame containing the variables to consider.
#' @param x The x-variable to consider. Must be a date variable in 'yyyy-mm-dd' format.
#' @param y The y-variable to consider.
#' @param curve Optional. The line's curve type to render.
#' A complete list can be found here <https://github.com/d3/d3-shape#curves>.
#' Defaults to 'curveLinear'.
#' @param duration The duration in Milliseconds of the animation. Defaults to 5000.
#' @param stroke The color of the line. Defaults to 'crimson'.
#' @param stroke_width The width of the line. Defaults to 1.5.
#' @param x_ticks Optional. the number of x-axis ticks to consider.
#' @param y_ticks Optional. The number of y-axis ticks to consider.
#' @param x_title Optional. The title of the x-axis.
#' @param x_title_font_size The font size of the x-axis title. Defaults to 16.
#' @param y_title Optional. The title of the y-axis.
#' @param y_title_font_size The font size of the y-axis title. Defaults to 16.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 22.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bg_col The background color of the SVG. Defaults to "#CAD0D3" HEX color.
#' @param opacity The color opacity of the bars (from 0 to 1). Defaults to 1.
#' @param axis_col the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An animated SVG line chart.
#' @export
#'
#' @examples
#'airpassengers <- data.frame(
#'  passengers = as.matrix(AirPassengers),
#'  date= zoo::as.Date(time(AirPassengers))
#')
#'anim_line_chart(
#'  data = airpassengers,
#'  x = "date",
#'  y = "passengers",
#'  duration = 10000 # in milliseconds (10 seconds)
#')


anim_line_chart <- function(
    data,
    x,
    y,
    curve = "curveLinear",
    duration = 5000,
  stroke = "crimson",
  stroke_width = 1.5,
  x_ticks = NULL,
  y_ticks = NULL,
  x_title = NULL,
  x_title_font_size = 16,
  y_title = NULL,
  y_title_font_size = 16,
  title = NULL,
  title_font_size = 22,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bg_col = "#CAD0D3",
  opacity = 1,
  axis_col = "black",
  width = NULL,
  height = NULL
) {

  if (is.null(data[[x]]) || is.null(data[[y]])) {
    stop("Please check that x and y belong to the specified data frame")
  }


  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data = data,
    script = ddplot_script("animatedlinechart.js"),
    options = list(
      x = x,
      y = y,
      curve = curve,
      duration = duration,
      xticks = x_ticks,
      yticks = y_ticks,
      xtitle = x_title,
      ytitle = y_title,
      title = title,
      font = font,
      stroke = stroke,
      strokeWidth = stroke_width,
      width = width,
      height = height,
      xtitleFontSize = x_title_font_size,
      ytitleFontSize = y_title_font_size,
      titleFontSize = title_font_size,
      bgcol = bg_col,
      opacity = opacity,
      axisCol = axis_col
    )
  )
}
