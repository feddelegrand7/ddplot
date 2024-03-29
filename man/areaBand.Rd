% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/areaband.R
\name{areaBand}
\alias{areaBand}
\title{Create a band chart}
\usage{
areaBand(
  data,
  x,
  yLower,
  yUpper,
  fill = "crimson",
  stroke = NULL,
  strokeWidth = NULL,
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
  axisCol = "black",
  width = NULL,
  height = NULL
)
}
\arguments{
\item{data}{The data frame containing the variables to consider.}

\item{x}{The x-variable to consider. Must be a date variable in 'yyyy-mm-dd' format.}

\item{yLower}{The y-lower band variable to consider.}

\item{yUpper}{The y-upper band variable to consider.}

\item{fill}{The color of the band. Defaults to 'crimson'.}

\item{stroke}{Optional. The color of the stroke of the band.}

\item{strokeWidth}{Optional. The width of the band stroke.}

\item{xticks}{Optional. the number of x-axis ticks to consider.}

\item{yticks}{Optional. The number of y-axis ticks to consider.}

\item{xtitle}{Optional. The title of the x-axis.}

\item{xtitleFontSize}{The font size of the x-axis title. Defaults to 16.}

\item{ytitle}{Optional. The title of the y-axis.}

\item{ytitleFontSize}{The font size of the y-axis title. Defaults to 16.}

\item{title}{Optional. The title of the plot.}

\item{titleFontSize}{The font size of the plot title. Defaults to 22.}

\item{font}{The font family to consider for the titles. Defaults to
"Verdana, Geneva, Tahoma, sans-serif".}

\item{bgcol}{The background color of the SVG. Defaults to "#CAD0D3" HEX color.}

\item{opacity}{The color opacity of the area chart (from 0 to 1). Defaults to 1.}

\item{axisCol}{the color of the x and y axis. It includes the ticks, the labels and titles.
Defaults to 'black'.}

\item{width}{Optional. The width of the SVG output.}

\item{height}{Optional. The height of the SVG output.}
}
\value{
A SVG band chart
}
\description{
Create a band chart
}
\examples{
airpassengers <- data.frame(
 passengers_lower = as.matrix(AirPassengers),
 passengers_upper = as.matrix(AirPassengers) + 40,
 date= zoo::as.Date(time(AirPassengers))
)

areaBand(
 data = airpassengers,
 x = "date",
 yLower = "passengers_lower",
 yUpper = "passengers_upper",
 fill = "yellow",
 stroke = "black"
)
}
