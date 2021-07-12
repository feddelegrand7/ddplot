#' Create a bar chart race.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The x-variable to consider.
#' @param y The y-variable to consider.
#' @param time The time variable to consider.
#' @param ease The easing method, you can find more
#' here <https://github.com/d3/d3-ease>. Defaults to 'Linear'.
#' @param frameDur The time spent paused on each frame (time point) in milliseconds.
#' @param transitionDur The time spent transitioning between frames in milliseconds.
#' @param colorCategory A D3 categorical color scheme, you can find more
#' here <https://github.com/d3/d3-scale-chromatic#categorical>. Defaults to 'Accent'.
#' @param sort Whether to sort or not the bars. Takes three values
#' 'none' which is the default, 'ascending' or 'descending'. Defaults to 'descending'.
#' @param paddingWidth The distance between each bar.
#' The value goes from 0 to 0.99 included. Defaults to 0.1.
#' @param xticks Optional. the number of x-axis ticks to consider.
#' @param xFontSize the font size of the x-axis labels. Defaults to 10.
#' @param yFontSize the font size of the y-axis labels. Defaults to 10.
#' @param xticks the number of y-axis ticks to consider. Defaults to 10.
#' @param xtitle Optional. The title of the x-axis.
#' @param xtitleFontSize The font size of the x-axis title. Defaults to 16.
#' @param ytitle Optional. The title of the y-axis.
#' @param ytitleFontSize The font size of the y-axis title. Defaults to 14.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param stroke The stroke color of the bars. Defaults to 'black'.
#' @param strokeWidth Optional. the stroke width of the bars.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "#CAD0D3" HEX color.
#' @param panelcol The background color of the panel. Defaults to "#EBEBEBFF" HEX color.
#' @param xgridlinecol The color of the x-axis grid lines. Defaults to 'white'.
#' @param opacity The color opacity of the bars (from 0 to 1). Defaults to 1.
#' @param timeLabel Whether to show a label for the value of the time variable. Defaults to TRUE.
#' @param timeLabelOpts Options for labeling the value of the time variable.
#' Takes a list specifying the `size`, `prefix`, `suffix`, `xOffset`, and `yOffset`.
#' Offsets are scaled relative to the dimensions of the label.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An animated SVG bar chart race, wrapped in a div.
#' @export
#' @examples
#' data <- data.frame(
#'   pop = c(57,66,76,88,101,114,129,143,156,
#'           169,180,190,69,71,74,76,79,78,78,78,81,82,82,82,86,
#'           92,96,101,107,114,118,122,124,126,127,127,30,35,
#'           41,48,56,64,72,80,88,96,102,109,22,26,30,35,41,
#'           47,53,60,67,75,83,91,26,29,34,39,45,51,56,63,70,
#'           76,81,85),
#'   year = c(1952L,1957L,1962L,1967L,1972L,1977L,
#'            1982L,1987L,1992L,1997L,2002L,2007L,1952L,1957L,1962L,
#'            1967L,1972L,1977L,1982L,1987L,1992L,1997L,2002L,2007L,
#'            1952L,1957L,1962L,1967L,1972L,1977L,1982L,1987L,1992L,
#'            1997L,2002L,2007L,1952L,1957L,1962L,1967L,1972L,1977L,
#'            1982L,1987L,1992L,1997L,2002L,2007L,1952L,1957L,1962L,
#'            1967L,1972L,1977L,1982L,1987L,1992L,1997L,2002L,2007L,
#'            1952L,1957L,1962L,1967L,1972L,1977L,1982L,1987L,1992L,
#'            1997L,2002L,2007L),
#'   country = as.factor(c("Brazil","Brazil",
#'                         "Brazil","Brazil","Brazil","Brazil","Brazil",
#'                         "Brazil","Brazil","Brazil","Brazil","Brazil","Germany",
#'                         "Germany","Germany","Germany","Germany",
#'                         "Germany","Germany","Germany","Germany","Germany",
#'                         "Germany","Germany","Japan","Japan","Japan","Japan",
#'                         "Japan","Japan","Japan","Japan","Japan","Japan",
#'                         "Japan","Japan","Mexico","Mexico","Mexico",
#'                         "Mexico","Mexico","Mexico","Mexico","Mexico",
#'                         "Mexico","Mexico","Mexico","Mexico","Philippines",
#'                         "Philippines","Philippines","Philippines","Philippines",
#'                         "Philippines","Philippines","Philippines",
#'                         "Philippines","Philippines","Philippines","Philippines",
#'                         "Vietnam","Vietnam","Vietnam","Vietnam",
#'                         "Vietnam","Vietnam","Vietnam","Vietnam","Vietnam",
#'                         "Vietnam","Vietnam","Vietnam"))
#' )
#'
#' barChartRace(
#'   data = data,
#'   x = "pop",
#'   y = "country",
#'   time = "year",
#'   ytitle = "Country",
#'   xtitle = "Population (in millions)",
#'   title = "Bar chart race of country populations"
#' )
#'
barChartRace <- function(
  data,
  x,
  y,
  time,
  ease = "Linear",
  frameDur = 500,
  transitionDur = 500,
  colorCategory = "Accent",
  sort = "descending",
  paddingWidth = 0.1,
  xFontSize = 10,
  yFontSize = 10,
  xticks = 10,
  xtitle = NULL,
  xtitleFontSize = 16,
  ytitle = NULL,
  ytitleFontSize = 14,
  title = NULL,
  titleFontSize = 22,
  stroke = "black",
  strokeWidth = NULL,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "#CAD0D3",
  panelcol = "#EBEBEBFF",
  xgridlinecol = "white",
  opacity = 1,
  timeLabel = TRUE,
  timeLabelOpts = list(
    size = 32,
    prefix = "",
    suffix = "",
    xOffset = 0.5,
    yOffset = 1
  ),
  width = NULL,
  height = NULL
) {

  if (is.null(data[[x]]) || is.null(data[[y]])) {
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

  timeLabelOpts <- modifyList(
    list(
      size = 32,
      prefix = "",
      suffix = "",
      xOffset = 0.5,
      yOffset = 1
    ),
    timeLabelOpts
  )

  r2d3::r2d3(
    data = data,
    container = "div",
    script = system.file(
      "d3/scatterplot/barchartrace.js",
      package = "ddplot"
    ),
    width = width,
    height = height,
    options = list(
      x = x,
      y = y,
      time = time,
      ease = ease,
      frameDur = frameDur,
      transitionDur = transitionDur,
      colorCategory = colorCategory,
      sort = sort,
      paddingWidth = paddingWidth,
      xFontSize = xFontSize,
      yFontSize = yFontSize,
      xticks = xticks,
      xtitle = xtitle,
      ytitle = ytitle,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      title = title,
      titleFontSize = titleFontSize,
      stroke = stroke,
      strokeWidth = strokeWidth,
      font = font,
      bgcol = bgcol,
      panelcol = panelcol,
      xgridlinecol = xgridlinecol,
      opacity = opacity,
      timeLabel = timeLabel,
      timeLabelOpts = timeLabelOpts
    )
  )
}

