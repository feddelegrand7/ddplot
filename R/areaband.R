
#' Create a band chart
#'
#' @param data The data frame containing the variables to consider.
#' @param x The x-variable to consider. Must be a date variable in 'yyyy-mm-dd' format.
#' @param yLower The y-lower band variable to consider.
#' @param yUpper The y-upper band variable to consider.
#' @param fill The color of the band. Defaults to 'crimson'.
#' @param stroke Optional. The color of the stroke of the band.
#' @param strokeWidth Optional. The width of the band stroke.
#' @param id Optional. The id of the SVG output.
#' @param xticks Optional. the number of x-axis ticks to consider.
#' @param yticks Optional. The number of y-axis ticks to consider.
#' @param xtitle Optional. The title of the x-axis.
#' @param xtitleFontSize The font size of the x-axis title. Defaults to 16.
#' @param ytitle Optional. The title of the y-axis.
#' @param ytitleFontSize The font size of the y-axis title. Defaults to 16.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "#CAD0D3" HEX color.
#' @param opacity The color opacity of the area chart (from 0 to 1). Defaults to 1.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return A SVG band chart
#' @export
#'
#' @examples
#' airpassengers <- data.frame(
#'   passengers_lower = as.matrix(AirPassengers),
#'   passengers_upper = as.matrix(AirPassengers) + 40,
#'   date= zoo::as.Date(time(AirPassengers))
#' )
#'
#' areaBand(
#'   data = airpassengers,
#'   x = "date",
#'   yLower = "passengers_lower",
#'   yUpper = "passengers_upper"
#' )

areaBand <- function(
  data,
  x,
  yLower,
  yUpper,
  fill = "crimson",
  stroke = NULL,
  strokeWidth = NULL,
  id = NULL,
  xticks = NULL,
  yticks = NULL,
  xtitle = NULL,
  xtitleFontSize = 16,
  ytitle = NULL,
  ytitleFontSize = 16,
  title = NULL,
  titleFontSize = 22,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "#CAD0D3",
  opacity = 1,
  width = NULL,
  height = NULL
) {


  if (is.null(data[[x]]) ||
      is.null(data[[yLower]]) ||
      is.null(data[[yUpper]])) {
    stop("Please check that x and yLower and yUpper belong to the specified data frame")
  }
  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/areaband.js",
      package = "ddplot"
    ),
    options = list(
      x = x,
      yLower = yLower,
      yUpper = yUpper,
      fill = fill,
      xticks = xticks,
      yticks = yticks,
      xtitle = xtitle,
      ytitle = ytitle,
      title = title,
      font = font,
      stroke = stroke,
      strokeWidth = strokeWidth,
      width = width,
      height = height,
      id = id,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      titleFontSize = titleFontSize,
      bgcol = bgcol,
      opacity = opacity
    )
  )
}
