% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/parliamant_chart.R
\name{parliament_chart}
\alias{parliament_chart}
\title{Display a Parliament  Chart}
\usage{
parliament_chart(
  data,
  categorical_column,
  numerical_column,
  seatSize = 6,
  padding = 2,
  maxRows = NULL,
  title = NULL,
  titleFontSize = 22,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "#CAD0D3",
  width = NULL,
  height = NULL
)
}
\arguments{
\item{data}{A data frame with a categorical column and a numerical column}

\item{categorical_column}{The categorical column to consider}

\item{numerical_column}{The numerical column to consider}

\item{seatSize}{The size of each seat. Defaults to 6.}

\item{padding}{The padding between seats. Defaults to 2.}

\item{maxRows}{The maximum number of rows. Optional.}

\item{title}{The title of the chart. Optional.}

\item{titleFontSize}{Font size for the title. Defaults to 22.}

\item{font}{Font family for text. Defaults to "Verdana, Geneva, Tahoma, sans-serif".}

\item{bgcol}{Background color of the chart. Defaults to "#CAD0D3".}

\item{width}{Width of the SVG canvas. Optional.}

\item{height}{Height of the SVG canvas. Optional.}
}
\value{
A D3-rendered Parliament chart
}
\description{
Display a Parliament  Chart
}
\examples{
political_results_example <- data.frame(
    political_party = c("SDP", "CDU", "Linke"),
    number_of_seats = c(200, 40, 30)
)
parliament_chart(
  data = political_results_example,
  categorical_column = "political_party",
  numerical_column = "number_of_seats",
  title = "German Bundestag (results not real, just an example)",
  seatSize = 10,
  bgcol = "#fefefe"
)
}
