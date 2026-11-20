# Shared helpers for the playful charts (heart_fill(), glass_fill(),
# plant_growth(), flame(), flower(), ...). Their scripts are prepended with
# playkit.js through play_script("<chart>.js"). playkit.js is also prepended to
# the data charts by chart_script() (R/chart_utils.R).

# @noRd
play_script <- function(file) {
  ddplot_script(c("playkit.js", file))
}

# A level between 0 and 1 (values outside are clamped).
# @noRd
play_level <- function(x, name = "fill_level") {
  if (!is.numeric(x) || length(x) != 1 || is.na(x)) {
    stop("'", name, "' must be a single number between 0 and 1")
  }
  min(1, max(0, x))
}

# An optional level (NULL allowed).
# @noRd
play_target <- function(x, name = "target") {
  if (is.null(x)) return(NULL)
  play_level(x, name)
}

# @noRd
play_font <- function(font) {
  if (!is.character(font) || length(font) != 1) stop("'font' must be a single string")
  if (grepl(";", font)) stop("Please remove the ';' character from your font argument.")
  font
}

# A size: NULL, a number or a CSS size such as "16px".
# @noRd
play_size <- function(x, name) {
  if (is.null(x)) return(NULL)
  v <- suppressWarnings(as.numeric(sub("px$", "", as.character(x))))
  if (length(x) != 1 || is.na(v) || v <= 0) stop("'", name, "' must be a positive number")
  v
}

# @noRd
play_flag <- function(x, name) {
  if (!is.logical(x) || length(x) != 1 || is.na(x)) stop("'", name, "' must be TRUE or FALSE")
  x
}
