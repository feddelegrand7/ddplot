

#' Create a horizontal lollipop chart
#'
#' @param data The data frame containing the variables to consider.
#' @param label The categorical variable to consider. Will be plotted on the x-axis.
#' @param value The numeric variable to consider. Will be plotted on the y-axis.
#' @param sort Whether to sort or not the vertical lines. Takes three values
#' 'none' which is the default, 'ascending' or 'descending'.
#' @param bgcol The background-color of the SVG output. Defaults to 'salmon'.
#' @param valueTicks Optional. the number of x-axis ticks to consider.
#' @param labelTicks Optional. The number of y-axis ticks to consider.
#' @param valueFontSize the font size of the x-axis labels. Defaults to 10.
#' @param labelFontSize the font size of the y-axis labels. Defaults to 10.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param valueTitle Optional. The title of the x-axis.
#' @param valueTitleFontSize The font size of the x-axis title. Defaults to 14.
#' @param labelTitle Optional. The title of the y-axis.
#' @param labelTitleFontSize The font size of the y-axis title. Defaults to 14.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param lineStroke The stroke color of the vertical lines. Defaults to 'maroon'.
#' @param lineStrokeWidth The vertical lines stroke's width. Defaults to 4.
#' @param circleFill The color of the circles. Defaults to 'lime'.
#' @param circleStroke The color of the stroke surrounding the circle. Defaults to 'lime'.
#' @param circleStrokeWidth The width of the circles' stroke. Defaults to 1.
#' @param circleRadius The radius of the circles. Defaults to 10.
#' @param axisCol the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.

#' @return A SVG horizontal lollipop chart.
#' @export
#'


horzLollipop <- function(data,
                          label,
                          value,
                          sort = 'none',
                          bgcol = "white",
                          valueTicks = NULL,
                          labelTicks = NULL,
                          valueFontSize = 12,
                          labelFontSize = 12,
                          font = "Verdana, Geneva, Tahoma, sans-serif",
                          valueTitle = NULL,
                          valueTitleFontSize = 14,
                          labelTitle = NULL,
                          labelTitleFontSize = 14,
                          title = NULL,
                          titleFontSize = 20,
                          lineStroke = "maroon",
                          lineStrokeWidth = 4,
                          circleFill = "lime",
                          circleStroke = "lime",
                          circleStrokeWidth = 1,
                          circleRadius = 5,
                          axisCol = "black",
                          width = NULL,
                          height = NULL

) {



  if (is.null(data[[label]]) || is.null(data[[value]])) {
    stop("Please check that x and y belong to the specified data frame")
  }

  if (!(any(c('none',
              'ascending',
              'descending') %in% sort))) {
    stop("
    the sort parameter can only take the following values:
    'none', 'ascending' or 'descending'
       ")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/horzlollipop.js",
      package = "ddplot"
    ),
    options = list(
      label = label,
      value = value,
      sort = sort,
      bgcol = bgcol,
      valueTicks = valueTicks,
      labelTicks = labelTicks,
      valueFontSize = valueFontSize,
      labelFontSize = labelFontSize,
      font = font,
      valueTitle = valueTitle,
      valueTitleFontSize = valueTitleFontSize,
      labelTitle = labelTitle,
      labelTitleFontSize = labelTitleFontSize,
      title = title,
      titleFontSize = titleFontSize,
      lineStroke = lineStroke,
      lineStrokeWidth = lineStrokeWidth,
      circleStroke = circleStroke,
      circleStrokeWidth = circleStrokeWidth,
      circleFill = circleFill,
      circleRadius = circleRadius,
      axisCol = axisCol,
      width = width,
      height = height

    )
  )

}
