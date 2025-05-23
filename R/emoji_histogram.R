#' Create a histogram.
#'
#' @param x A vector of data.
#' @param bins The number of bins to consider. Defaults to 30.
#' @param emoji The emoji to use, defaults to "🌸"
#' @param emoji_size The size of the emoji. Defaults to 20
#' @param fill The color of the bars. Defaults to 'crimson'.
#' @param xFontSize the font size of the x-axis labels. Defaults to 10.
#' @param yFontSize the font size of the y-axis labels. Defaults to 10.
#' @param xticks Optional. the number of x-axis ticks to consider.
#' @param yticks Optional. The number of y-axis ticks to consider.
#' @param xtitle Optional. The title of the x-axis.
#' @param xtitleFontSize The font size of the x-axis title. Defaults to 16.
#' @param ytitle Optional. The title of the y-axis.
#' @param ytitleFontSize The font size of the y-axis title. Defaults to 16.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param stroke The stroke color of the bars. Defaults to 'crimson'.
#' @param strokeWidth Optional. the stroke width of the bars.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "#CAD0D3" HEX color.
#' @param opacity The color opacity of the bars (from 0 to 1). Defaults to 1.
#' @param axisCol the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return A SVG histogram.
#' @export
#' @examples
#'
#' emoji_histogram(
#'   x = mtcars$mpg,
#'   emoji = "🌸",
#'   bins = 20,
#'   fill = "crimson",
#'   stroke = "white",
#'   strokeWidth = 1,
#'   title = "Distribution of the hwy variable",
#'   width = "20",
#'   height = "10"
#' )

emoji_histogram <- function(
    x = x,
    bins = 10,
    emoji = "🌸",
    emojiSize = 20,
    xticks = 10,
    yticks = 5,
    xtitle = "Value",
    ytitle = "Count",
    title = "Emoji Histogram",
    font = "Verdana, Geneva, Tahoma, sans-serif",
    xFontSize = 10,
    yFontSize = 10,
    xtitleFontSize = 14,
    ytitleFontSize = 14,
    titleFontSize = 18,
    stroke = "#444",
    strokeWidth = 0.5,
    width = 500,
    height = 300,
    opacity = 0.9,
    axisCol = "#555",
    bgcol = "#fffafc"
) {

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data = x,
    script = system.file(
      "d3/scatterplot/emoji_histogram.js",
      package = "ddplot"
    ),
    options = list(
      x = x,
      bins = bins,
      emoji = emoji,
      emojiSize = emojiSize,
      xticks = xticks,
      yticks = yticks,
      xtitle = xtitle,
      ytitle = ytitle,
      title = title,
      font = font,
      xFontSize = xFontSize,
      yFontSize = yFontSize,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      titleFontSize = titleFontSize,
      stroke = stroke,
      strokeWidth = strokeWidth,
      width = width,
      height = height,
      opacity = opacity,
      axisCol = axisCol,
      bgcol = bgcol
    )
  )

}





