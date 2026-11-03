# Build the `script` argument passed to r2d3::r2d3().
#
# Every chart script is preceded by ddplotreset.js, which clears the previous
# render and stops timers it left behind. This is required for Shiny: when
# r2d3::renderD3() sends new data to an existing r2d3::d3Output(), r2d3 re-runs
# the chart script on the same root element instead of creating a fresh one.
#
# @param file Name of the chart's JS file in inst/d3/scatterplot/.
# @noRd
ddplot_script <- function(file) {
  c(
    system.file("d3/scatterplot/ddplotreset.js", package = "ddplot"),
    system.file("d3/scatterplot", file, package = "ddplot")
  )
}
