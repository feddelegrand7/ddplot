# Shared helpers for the data charts added in ddplot 1.0.0 (box_plot(),
# density_plot(), heatmap_chart(), sankey_diagram(), network_graph(),
# likert_chart(), funnel_chart(), gantt_chart(), candlestick_chart(),
# circle_packing()). Their scripts are prepended with playkit.js and
# chartkit.js through chart_script("<chart>.js").

# @noRd
chart_script <- function(file) {
  ddplot_script(c("playkit.js", "chartkit.js", file))
}

# @noRd
ck_df <- function(data) {
  if (!is.data.frame(data)) stop("'data' must be a data frame")
  if (nrow(data) == 0) stop("'data' has no rows")
  invisible(data)
}

# A column name (optionally numeric, optionally NULL).
# @noRd
ck_col <- function(data, nm, arg, numeric = FALSE, null_ok = FALSE) {
  if (is.null(nm)) {
    if (null_ok) return(invisible(NULL))
    stop("'", arg, "' is required")
  }
  if (!is.character(nm) || length(nm) != 1 || is.na(nm) || is.null(data[[nm]])) {
    stop("'", arg, "' must be the name of a column of 'data'")
  }
  if (numeric && !is.numeric(data[[nm]])) {
    stop("Column '", nm, "' ('", arg, "') must be numeric")
  }
  invisible(nm)
}

# @noRd
ck_flag <- function(v, arg) {
  if (!is.logical(v) || length(v) != 1 || is.na(v)) stop("'", arg, "' must be TRUE or FALSE")
  v
}

# @noRd
ck_num <- function(v, arg, min = -Inf, max = Inf) {
  if (!is.numeric(v) || length(v) != 1 || !is.finite(v) || v < min || v > max) {
    rng <- if (is.finite(min) && is.finite(max)) paste0(" between ", min, " and ", max)
           else if (is.finite(min)) paste0(" of at least ", min) else ""
    stop("'", arg, "' must be a single number", rng)
  }
  v
}

# @noRd
ck_font <- function(font) {
  if (!is.character(font) || length(font) != 1) stop("'font' must be a single string")
  if (grepl(";", font)) stop("Please remove the ';' character from your font argument.")
  font
}

# @noRd
ck_string <- function(v, arg, null_ok = TRUE) {
  if (is.null(v) && null_ok) return(NULL)
  if (!is.character(v) || length(v) != 1 || is.na(v)) stop("'", arg, "' must be a single string")
  v
}

# The order of the levels of a column: factor levels, sorted numbers, or the
# order of first appearance for text.
# @noRd
ck_levels <- function(v) {
  if (is.factor(v)) return(levels(droplevels(v)))
  if (is.numeric(v)) return(as.character(sort(unique(v[!is.na(v)]))))
  unique(as.character(v[!is.na(v)]))
}

# One colour per level (as a list, so it stays a JSON array), or NULL to use
# the default palette. A named vector is matched by names (unmatched levels get
# "" = the palette colour); an unnamed vector is recycled.
# @noRd
ck_colors <- function(colors, levels, arg = "colors") {
  if (is.null(colors)) return(NULL)
  if (!is.character(colors) || length(colors) == 0 || anyNA(colors)) {
    stop("'", arg, "' must be a character vector of colours")
  }
  out <- if (!is.null(names(colors)) && any(names(colors) != "")) {
    v <- unname(colors[levels])
    v[is.na(v)] <- ""
    v
  } else {
    rep_len(colors, length(levels))
  }
  as.list(out)
}

# Dates (Date, POSIXct or text) as milliseconds since 1970 for JS.
# @noRd
ck_time <- function(v, arg) {
  if (inherits(v, "POSIXt")) return(as.numeric(v) * 1000)
  if (inherits(v, "Date")) return(as.numeric(v) * 86400000)
  if (is.character(v) || is.factor(v)) {
    d <- suppressWarnings(as.POSIXct(as.character(v), tz = "UTC",
                                     tryFormats = c("%Y-%m-%d %H:%M:%OS", "%Y-%m-%d %H:%M", "%Y-%m-%d")))
    if (all(is.na(d[!is.na(v)])) && any(!is.na(v))) stop("Column '", arg, "' could not be read as dates")
    return(as.numeric(d) * 1000)
  }
  if (is.numeric(v)) return(as.numeric(v) * 86400000)
  stop("Column '", arg, "' must contain dates")
}

# Is the time column made of whole days (so it is shown without hours)?
# @noRd
ck_is_day <- function(v) inherits(v, "Date") || (!inherits(v, "POSIXt") && !is.numeric(v) &&
  all(nchar(as.character(v[!is.na(v)])) <= 10))
