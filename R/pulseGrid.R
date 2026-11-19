#' Create a pulse grid.
#'
#' `pulse_grid()` creates a tiled grid where each cell color reflects a numeric
#' value and the cells gently pulse according to their intensity.
#'
#' @param data The data frame containing the grid coordinates and values.
#' @param x The column name mapped to the grid columns.
#' @param y The column name mapped to the grid rows.
#' @param value The numeric column name mapped to tile intensity.
#' @param low The low end color of the value scale. Defaults to '#E0FBFC'.
#' @param high The high end color of the value scale. Defaults to '#0B525B'.
#' @param stroke The border color of each tile. Defaults to 'white'.
#' @param stroke_width Border width of each tile. Defaults to 1.
#' @param cell_padding Space between tiles, from 0 to 0.9. Defaults to 0.12.
#' @param corner_radius Corner radius of each tile. Defaults to 10.
#' @param pulse Logical. Whether to animate the tiles. Defaults to `TRUE`.
#' @param pulse_strength Numeric multiplier controlling pulse amplitude.
#' Defaults to 0.18.
#' @param show_values Logical. Whether to print values inside tiles.
#' Defaults to `TRUE`.
#' @param digits Number of digits used for in-cell labels. Defaults to 1.
#' @param value_font_size Font size of in-cell labels. Defaults to 12.
#' @param x_font_size Font size of the column labels. Defaults to 12.
#' @param y_font_size Font size of the row labels. Defaults to 12.
#' @param title Optional. The title of the plot.
#' @param title_font_size Font size of the plot title. Defaults to 22.
#' @param font The font family used in labels and title. Defaults to
#' 'Verdana, Geneva, Tahoma, sans-serif'.
#' @param bg_col Background color of the SVG. Defaults to '#0F172A'.
#' @param label_color Color of the row and column labels. Defaults to '#F8FAFC'.
#' @param title_color Color of the title. Defaults to '#F8FAFC'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return A SVG pulse grid.
#' @export
#'
#' @examples
#' pulse_data <- expand.grid(
#'   hour = c("09:00", "12:00", "15:00", "18:00"),
#'   team = c("North", "South", "East")
#' )
#' pulse_data$load <- c(0.35, 0.72, 0.56, 0.91,
#'                      0.41, 0.67, 0.83, 0.58,
#'                      0.28, 0.49, 0.77, 0.63)
#'
#' pulse_grid(
#'   data = pulse_data,
#'   x = "hour",
#'   y = "team",
#'   value = "load",
#'   title = "Team Activity Pulse Grid",
#'   low = "#D9F0FF",
#'   high = "#EE6C4D",
#'   bg_col = "#0B132B"
#' )

pulse_grid <- function(
  data,
  x,
  y,
  value,
  low = "#E0FBFC",
  high = "#0B525B",
  stroke = "white",
  stroke_width = 1,
  cell_padding = 0.12,
  corner_radius = 10,
  pulse = TRUE,
  pulse_strength = 0.18,
  show_values = TRUE,
  digits = 1,
  value_font_size = 12,
  x_font_size = 12,
  y_font_size = 12,
  title = NULL,
  title_font_size = 22,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bg_col = "#0F172A",
  label_color = "#F8FAFC",
  title_color = "#F8FAFC",
  width = NULL,
  height = NULL
) {

  if (is.null(data[[x]]) || is.null(data[[y]]) || is.null(data[[value]])) {
    stop("Please check that x, y and value belong to the specified data frame")
  }

  if (!is.numeric(data[[value]])) {
    stop("The value column must be numeric")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (cell_padding < 0 || cell_padding >= 1) {
    stop("cell_padding must be between 0 and 0.99")
  }

  if (pulse_strength < 0) {
    stop("pulse_strength must be non-negative")
  }

  r2d3::r2d3(
    data = data,
    script = ddplot_script("pulsegrid.js"),
    options = list(
      x = x,
      y = y,
      value = value,
      low = low,
      high = high,
      stroke = stroke,
      strokeWidth = stroke_width,
      cellPadding = cell_padding,
      cornerRadius = corner_radius,
      pulse = pulse,
      pulseStrength = pulse_strength,
      showValues = show_values,
      digits = digits,
      valueFontSize = value_font_size,
      xFontSize = x_font_size,
      yFontSize = y_font_size,
      title = title,
      titleFontSize = title_font_size,
      font = font,
      bgcol = bg_col,
      labelColor = label_color,
      titleColor = title_color,
      width = width,
      height = height
    )
  )
}
