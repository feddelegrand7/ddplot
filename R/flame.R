#' Show an intensity as a flickering flame
#'
#' Draws a flame whose height follows an intensity: the higher the
#' intensity, the taller the flame, the faster it flickers and the more sparks
#' it throws. The flame is made of three layers (outer, middle and core) with a
#' warm glow behind it, and can burn on its own, on a candle or on logs. Useful
#' to show the state of a critical number, such as the number of errors in a
#' process. When the chart scrolls into view, the flame ignites and grows to
#' its height while the value (with \code{showValue = TRUE}) counts up.
#'
#' @section Interactions:
#' \itemize{
#'   \item Move the mouse near the flame: it leans away, as if you were
#'     blowing on it.
#'   \item Click the flame: it flares up and throws a burst of sparks.
#'   \item With \code{draggable = TRUE}, drag up or down on the flame to set
#'     the intensity, or focus the chart (click it or press Tab) and use the
#'     arrow keys.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking the flame sets \code{input$id_clicked} to a list with
#' \code{intensity}, and, with \code{draggable = TRUE}, setting the intensity
#' sets \code{input$id_value} to the new intensity. When the chart is
#' re-rendered with a new intensity, the flame grows or shrinks from the old
#' height to the new one.
#'
#' @param intensity A non-negative number: the intensity of the flame. The
#'   height of the flame grows linearly with it up to \code{maxIntensity},
#'   where the flame reaches the top of the chart. Defaults to 50.
#' @param flameGradientColors A length-3 character vector of colours, from
#'   the core of the flame outwards. Defaults to
#'   \code{c("#fffbe6", "#ffc233", "#e8452c")}.
#' @param flameOutline Optional. The colour of an outline drawn around the
#'   flame. By default the flame has no outline.
#' @param bgcol The background colour. Defaults to "white". The flame glows
#'   more on dark backgrounds.
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#' @param maxIntensity The intensity at which the flame reaches its full
#'   height. Defaults to 100. Higher intensities do not make the flame taller.
#' @param base What the flame burns on: "none" (the default), "candle" or
#'   "logs".
#' @param showValue Logical. Write the intensity below the flame. Defaults to
#'   FALSE.
#' @param valueSuffix A text added after the value, such as " errors".
#'   Defaults to "".
#' @param titleText Optional. A caption below the flame.
#' @param titleColor Optional. The colour of the caption. Defaults to
#'   \code{labelColor}.
#' @param titleFontSize The font size of the caption. Defaults to 14.
#' @param labelColor Optional. The colour of the value. Defaults to dark grey
#'   on light backgrounds and light grey on dark ones.
#' @param labelFontSize Optional. The font size of the value. By default it
#'   depends on the size of the chart.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param flicker Logical. Animate the flame. Defaults to TRUE.
#' @param sparks Logical. Show sparks rising from the flame. Defaults to TRUE.
#' @param draggable Logical. Let the viewer change the intensity by dragging
#'   or with the arrow keys. Defaults to FALSE.
#' @param animate Logical. Ignite the flame when it first comes into view.
#'   Defaults to TRUE.
#'
#' @return An r2d3 htmlwidget.
#' @export
#'
#' @examples
#' flame(intensity = 20)
#' flame(
#'   intensity = 80,
#'   flameGradientColors = c("#e0f7ff", "#5ac8fa", "#1d4ed8"),
#'   bgcol = "#111111",
#'   base = "logs"
#' )
#' flame(
#'   intensity = 35,
#'   base = "candle",
#'   showValue = TRUE,
#'   valueSuffix = " errors",
#'   titleText = "Failed jobs today"
#' )
flame <- function(
    intensity = 50,
    flameGradientColors = c("#fffbe6", "#ffc233", "#e8452c"),
    flameOutline = NULL,
    bgcol = "white",
    width = NULL,
    height = NULL,
    maxIntensity = 100,
    base = c("none", "candle", "logs"),
    showValue = FALSE,
    valueSuffix = "",
    titleText = NULL,
    titleColor = NULL,
    titleFontSize = 14,
    labelColor = NULL,
    labelFontSize = NULL,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    flicker = TRUE,
    sparks = TRUE,
    draggable = FALSE,
    animate = TRUE
) {
  if (!length(flameGradientColors) == 3) {
    stop(
      "flameGradientColors must be a length-3 vector of colors"
    )
  }
  if (!is.numeric(intensity) || length(intensity) != 1 || is.na(intensity) || intensity < 0) {
    stop("'intensity' must be a single non-negative number")
  }
  if (!is.numeric(maxIntensity) || length(maxIntensity) != 1 || is.na(maxIntensity) || maxIntensity <= 0) {
    stop("'maxIntensity' must be a positive number")
  }
  base <- match.arg(base)
  font <- play_font(font)

  r2d3::r2d3(
    data = NULL,
    script = play_script("flame.js"),
    width = width,
    height = height,
    options = list(
      intensity = intensity,
      flameColor0 = flameGradientColors[[1]],
      flameColor1 = flameGradientColors[[2]],
      flameColor2 = flameGradientColors[[3]],
      flameOutline = flameOutline,
      bgcol = bgcol,
      maxIntensity = maxIntensity,
      base = base,
      showValue = play_flag(showValue, "showValue"),
      valueSuffix = valueSuffix,
      titleText = titleText,
      titleColor = titleColor,
      titleFontSize = play_size(titleFontSize, "titleFontSize"),
      labelColor = labelColor,
      labelFontSize = play_size(labelFontSize, "labelFontSize"),
      font = font,
      flicker = play_flag(flicker, "flicker"),
      sparks = play_flag(sparks, "sparks"),
      draggable = play_flag(draggable, "draggable"),
      animate = play_flag(animate, "animate")
    )
  )
}
