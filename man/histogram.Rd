% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/histogram.R
\name{histogram}
\alias{histogram}
\title{Create a histogram.}
\usage{
histogram(
  x,
  bins = 30,
  fill = "crimson",
  xFontSize = 10,
  yFontSize = 10,
  xticks = NULL,
  yticks = NULL,
  xtitle = NULL,
  xtitleFontSize = 16,
  ytitle = NULL,
  ytitleFontSize = 16,
  title = NULL,
  titleFontSize = 22,
  stroke = "crimson",
  strokeWidth = NULL,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "#CAD0D3",
  opacity = 1,
  axisCol = "black",
  width = NULL,
  height = NULL
)
}
\arguments{
\item{x}{A vector of data.}

\item{bins}{The number of bins to consider. Defaults to 30.}

\item{fill}{The color of the bars. Defaults to 'crimson'.}

\item{xFontSize}{the font size of the x-axis labels. Defaults to 10.}

\item{yFontSize}{the font size of the y-axis labels. Defaults to 10.}

\item{xticks}{Optional. the number of x-axis ticks to consider.}

\item{yticks}{Optional. The number of y-axis ticks to consider.}

\item{xtitle}{Optional. The title of the x-axis.}

\item{xtitleFontSize}{The font size of the x-axis title. Defaults to 16.}

\item{ytitle}{Optional. The title of the y-axis.}

\item{ytitleFontSize}{The font size of the y-axis title. Defaults to 16.}

\item{title}{Optional. The title of the plot.}

\item{titleFontSize}{The font size of the plot title. Defaults to 22.}

\item{stroke}{The stroke color of the bars. Defaults to 'crimson'.}

\item{strokeWidth}{Optional. the stroke width of the bars.}

\item{font}{The font family to consider for the titles. Defaults to
"Verdana, Geneva, Tahoma, sans-serif".}

\item{bgcol}{The background color of the SVG. Defaults to "#CAD0D3" HEX color.}

\item{opacity}{The color opacity of the bars (from 0 to 1). Defaults to 1.}

\item{axisCol}{the color of the x and y axis. It includes the ticks, the labels and titles.
Defaults to 'black'.}

\item{width}{Optional. The width of the SVG output.}

\item{height}{Optional. The height of the SVG output.}
}
\value{
A SVG histogram.
}
\description{
Create a histogram.
}
\examples{

histogram(
  x = mtcars$mpg,
  bins = 20,
  fill = "crimson",
  stroke = "white",
  strokeWidth = 1,
  title = "Distribution of the hwy variable",
  width = "20",
  height = "10"
)
}
