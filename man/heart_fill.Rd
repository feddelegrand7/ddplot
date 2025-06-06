% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/heart_fill.R
\name{heart_fill}
\alias{heart_fill}
\title{Visualize a Heart Filling with Color using D3}
\usage{
heart_fill(
  fill_level = 0.65,
  heartSize = 150,
  strokeColor = "#C00",
  strokeWidth = 4,
  fillColor = "red",
  renderFillLabel = TRUE,
  labelColor = "#333",
  labelFontSize = "16px",
  titleText = "Fill level",
  titleColor = "#333",
  titleFontSize = "14px",
  font = "Verdana, Geneva, Tahoma, sans-serif"
)
}
\arguments{
\item{fill_level}{Numeric value between 0 and 1 indicating how full the heart should appear (e.g., 0.8 = 80% full).}

\item{heartSize}{Numeric width/height scale for the heart shape in pixels.}

\item{strokeColor}{Color of the heart outline.}

\item{strokeWidth}{Width of the outline stroke.}

\item{fillColor}{Fill color of the heart (used to indicate level).}

\item{renderFillLabel}{Logical; if `TRUE`, a percentage label is shown above the heart.}

\item{labelColor}{Color of the percentage label text.}

\item{labelFontSize}{Font size of the percentage label text (e.g., `"16px"`).}

\item{font}{Font family for text.}
}
\value{
An interactive D3 heart fill visualization.
}
\description{
This function renders a heart-shaped SVG graphic that fills from the bottom up based on the provided level.
The appearance of the heart and accompanying label can be fully customized.
}
\examples{
heart_fill(fill_level = 0.9)
heart_fill(fill_level = 0.4, fillColor = "pink", labelColor = "#C00", strokeColor = "#900")

}
