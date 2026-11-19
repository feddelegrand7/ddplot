#' Create an animated histogram.
#'
#' @param x A vector of data.
#' @param bins The number of bins to consider. Defaults to 30.
#' @param duration The duration of the bars' transition in milliseconds. Defaults to 2000.
#' @param delay The amount of time (in milliseconds) that
#' precedes before triggering the appearance of each bar. Defaults to 100.
#' @param fill The color of the bars. Defaults to 'crimson'.
#' @param x_font_size the font size of the x-axis labels. Defaults to 10.
#' @param y_font_size the font size of the y-axis labels. Defaults to 10.
#' @param xticks Optional. the number of x-axis ticks to consider.
#' @param yticks Optional. The number of y-axis ticks to consider.
#' @param xtitle Optional. The title of the x-axis.
#' @param xtitle_font_size The font size of the x-axis title. Defaults to 16.
#' @param ytitle Optional. The title of the y-axis.
#' @param ytitle_font_size The font size of the y-axis title. Defaults to 16.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 22.
#' @param stroke The stroke color of the bars. Defaults to 'crimson'.
#' @param stroke_width Optional. the stroke width of the bars.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "#CAD0D3" HEX color.
#' @param opacity The color opacity of the bars (from 0 to 1). Defaults to 1.
#' @param axis_col the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An animated SVG histogram.
#' @export
#'
#' @examples
#'animated_histogram(
#'  x = mtcars$mpg,
#'  duration = 2000,
#'  delay = 100
#')




animated_histogram <- function(
  x,
  bins = 30,
  duration = 2000,
  delay = 100,
  fill = "crimson",
  x_font_size = 10,
  y_font_size = 10,
  xticks = NULL,
  yticks = NULL,
  xtitle = NULL,
  xtitle_font_size = 16,
  ytitle = NULL,
  ytitle_font_size = 16,
  title = NULL,
  title_font_size = 22,
  stroke = "crimson",
  stroke_width = NULL,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "#CAD0D3",
  opacity = 1,
  axis_col = "black",
  width = NULL,
  height = NULL
) {


  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data = data,
    script = ddplot_script("animatedhistogram.js"),
    options = list(
      x = x,
      bins = bins,
      fill = fill,
      xticks = xticks,
      yticks = yticks,
      xtitle = xtitle,
      ytitle = ytitle,
      title = title,
      font = font,
      stroke = stroke,
      strokeWidth = stroke_width,
      width = width,
      height = height,
      xFontSize = x_font_size,
      yFontSize = y_font_size,
      xtitleFontSize = xtitle_font_size,
      ytitleFontSize = ytitle_font_size,
      titleFontSize = title_font_size,
      bgcol = bgcol,
      opacity = opacity,
      axisCol = axis_col,
      duration = duration,
      delay = delay
    )
  )
}
