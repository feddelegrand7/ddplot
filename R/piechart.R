
#' Create a pie chart
#'
#' @param data The data frame to consider.
#' @param value The numeric variable to consider.
#' @param label The labeling variable to consider.
#' @param colorCategory A D3 categorical color scheme, you can find more
#' here <https://github.com/d3/d3-scale-chromatic#categorical>. Defaults to 'Paired'
#' @param innerRadius The size of the inner radius of the pie.
#' Defaults to 0. Set the inner radius to a higher value to plot
#' a donut chart.
#' @param outerRadius The size of the outer radius of the pie.
#' @param padRadius From the D3 official documentation, The pad radius compute
#' the fixed linear distance separating adjacent arcs, defined as padRadius * padAngle.
#' @param padAngle Optional. From the D3 official documentation, the padAngle is used to set the
#' padding angle between consecutive arcs.
#' @param cornerRadius From the D3 official documentation, the value of the corner radius for rounded corners.
#' If the corner radius is greater than zero, the corners of the arc are rounded
#' using circles of the given radius. Defaults to 0.
#' @param labelFont The font family of the legend. Defaults to 'sans-serif'.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param font The font family to consider for the titles.
#' Defaults to "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param opacity The color opacity of the pie (from 0 to 1). Defaults to 1.
#' @param labelHeight The height of the legend. Defaults to 18.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return A SVG pie chart
#' @export
#'
#' @examples
#' library(dplyr) # needed for the starwars data frame
#'
#' # starwars is part of the dplyr data frame
#' mini_starwars <- starwars %>% tidyr::drop_na(mass) %>%
#'   sample_n(size = 5) # getting 5 random values
#'
#' pieChart(
#'   data = mini_starwars,
#'   value = "mass",
#'   label = "name"
#' )

pieChart <- function(
  data,
  value,
  label,
  colorCategory = "Paired",
  innerRadius = 0,
  outerRadius = "auto",
  padRadius = 0,
  padAngle = NULL,
  cornerRadius = 0,
  labelFont = 'sans-serif',
  title = NULL,
  titleFontSize = 22,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "white",
  opacity = 1,
  labelHeight = 18,
  width = NULL,
  height = NULL
) {

  if (is.null(data[[value]]) || is.null(data[[label]])) {
    stop("Please check that 'value' and 'label' belongs to the specified data frame")
  }


  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }



  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/piechart.js",
      package = "ddplot"
    ),
    options = list(
      value = value,
      label = label,
      title = title,
      font = font,
      width = width,
      height = height,
      titleFontSize = titleFontSize,
      bgcol = bgcol,
      opacity = opacity,
      colorCategory = colorCategory,
      innerRadius = innerRadius,
      outerRadius = outerRadius,
      labelHeight = labelHeight,
      padRadius = padRadius,
      padAngle = padAngle,
      cornerRadius = cornerRadius,
      labelFont = labelFont
    )
  )
}
