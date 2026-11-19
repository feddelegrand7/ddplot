# Shared helpers for the race charts (bar_chart_race(), line_race(), bubble_race(),
# radial_bar_race(), treemap_race(), donut_race()). Their scripts are prepended
# with racekit.js, the shared player (play / pause, timeline, speed, loop,
# keyboard), through ddplot_script(c("racekit.js", "<chart>.js")).

# The ddplot categorical palette.
# @noRd
dd_palette <- function() {
  c("#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
    "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0")
}

# Lighter shades of the palette, added after it when many colours are needed.
# @noRd
dd_palette_long <- function(n) {
  base <- dd_palette()[1:9]
  if (n > 9) {
    light <- vapply(base, function(h) {
      v <- strtoi(substring(h, c(2, 4, 6), c(3, 5, 7)), 16L)
      do.call(sprintf, c("#%02x%02x%02x", as.list(round(v * 0.55 + 255 * 0.45))))
    }, "")
    base <- c(base, unname(light))
  }
  rep_len(base, n)
}

# Colours for a set of keys: `fill` can be NULL (palette), a single colour, an
# unnamed vector (recycled) or a named vector (mapped by key, palette for the
# others).
# @noRd
race_colors <- function(keys, fill = NULL) {
  n <- length(keys)
  out <- dd_palette_long(n)
  if (!is.null(fill)) {
    if (!is.null(names(fill))) {
      m <- fill[keys]
      out[!is.na(m)] <- m[!is.na(m)]
    } else {
      out <- rep_len(as.character(fill), n)
    }
  }
  unname(as.character(out))
}

# Turn long data (one row per item and period) into the arrays used by the
# race scripts.
#
# @param data A data frame.
# @param id The name of the column identifying the items (bars, lines, ...).
# @param time The name of the column giving the period (numeric, Date,
#   POSIXct, factor or character).
# @param values The names of the numeric columns to keep.
# @param group Optional. The name of a column grouping the items (one group
#   per item, the first one found).
# @param agg How rows with the same item and period are combined: "sum",
#   "mean", "max", "min" or "last".
# @param fill_gaps Logical. Interpolate the values of an item linearly
#   between the periods where it is known (missing values before its first
#   and after its last known value are kept missing).
#
# @return A list with
#   frames    character, the label of each period (ISO dates for dates),
#   frameNum  numeric (or NULL), the numeric value of each period, used to
#             interpolate the period shown between two frames (milliseconds
#             since 1970 for dates),
#   timeType  "number", "date", "datetime" or "category",
#   items     character, the items in order of first appearance (or factor
#             levels),
#   groups    character (or NULL), the group of each item,
#   series    a named list (one entry per value column) of lists (one per
#             item) of numeric vectors (one value per frame, NA when
#             missing), wrapped in I() so they stay arrays in JSON.
# @noRd
race_prepare <- function(data, id, time, values, group = NULL,
                         agg = c("sum", "mean", "max", "min", "last"),
                         fill_gaps = TRUE) {
  agg <- match.arg(agg)
  if (!is.data.frame(data)) stop("'data' must be a data frame")
  need <- c(id = id, time = time)
  for (k in names(need)) {
    nm <- need[[k]]
    if (!is.character(nm) || length(nm) != 1 || is.null(data[[nm]])) {
      stop("'", k, "' must be the name of a column of 'data'")
    }
  }
  for (v in values) {
    if (!is.character(v) || length(v) != 1 || is.null(data[[v]])) {
      stop("'", v, "' is not a column of 'data'")
    }
    if (!is.numeric(data[[v]])) stop("'", v, "' must be a numeric column")
  }
  if (!is.null(group) && (!is.character(group) || length(group) != 1 || is.null(data[[group]]))) {
    stop("'group' must be the name of a column of 'data'")
  }

  tv <- data[[time]]
  keep <- !is.na(tv) & !is.na(data[[id]])
  data <- data[keep, , drop = FALSE]
  tv <- tv[keep]
  if (nrow(data) == 0) stop("no rows left with both an id and a time")

  # ---- periods -----------------------------------------------------------------
  if (inherits(tv, "POSIXt")) {
    ut <- sort(unique(as.numeric(tv)))
    frames <- format(as.POSIXct(ut, origin = "1970-01-01", tz = "UTC"), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
    frame_num <- ut * 1000
    time_type <- "datetime"
    tkey <- match(as.numeric(tv), ut)
  } else if (inherits(tv, "Date")) {
    ut <- sort(unique(as.numeric(tv)))
    frames <- format(as.Date(ut, origin = "1970-01-01"), "%Y-%m-%d")
    frame_num <- ut * 86400000
    time_type <- "date"
    tkey <- match(as.numeric(tv), ut)
  } else if (is.numeric(tv)) {
    ut <- sort(unique(tv))
    frames <- format(ut, trim = TRUE, scientific = FALSE, drop0trailing = TRUE)
    frame_num <- ut
    time_type <- "number"
    tkey <- match(tv, ut)
  } else {
    if (is.factor(tv)) {
      lv <- levels(droplevels(tv))
    } else {
      lv <- sort(unique(as.character(tv)))
    }
    frames <- lv
    frame_num <- NULL
    time_type <- "category"
    tkey <- match(as.character(tv), lv)
  }
  nf <- length(frames)

  # ---- items ---------------------------------------------------------------------
  iv <- data[[id]]
  items <- if (is.factor(iv)) levels(droplevels(iv)) else unique(as.character(iv))
  ikey <- match(as.character(iv), items)
  ni <- length(items)

  groups <- NULL
  if (!is.null(group)) {
    gv <- as.character(data[[group]])
    gv[is.na(gv)] <- "(missing)"
    groups <- vapply(seq_len(ni), function(k) gv[which(ikey == k)[1]], "")
  }

  # ---- values ----------------------------------------------------------------------
  fun <- switch(agg,
    sum = function(x) sum(x, na.rm = TRUE),
    mean = function(x) mean(x, na.rm = TRUE),
    max = function(x) max(x, na.rm = TRUE),
    min = function(x) min(x, na.rm = TRUE),
    last = function(x) x[length(x)]
  )
  xs <- if (is.null(frame_num)) seq_len(nf) else frame_num
  series <- lapply(values, function(v) {
    vv <- as.numeric(data[[v]])
    ok <- is.finite(vv)
    m <- matrix(NA_real_, nrow = ni, ncol = nf)
    if (any(ok)) {
      cell <- (tkey[ok] - 1) * ni + ikey[ok]
      s <- tapply(vv[ok], cell, fun)
      m[as.integer(names(s))] <- as.numeric(s)
    }
    lapply(seq_len(ni), function(k) {
      r <- m[k, ]
      if (fill_gaps) {
        known <- which(is.finite(r))
        if (length(known) >= 2) {
          inside <- seq(min(known), max(known))
          r[inside] <- stats::approx(xs[known], r[known], xout = xs[inside])$y
        }
      }
      I(r)
    })
  })
  names(series) <- values

  list(
    frames = I(frames),
    frameNum = if (is.null(frame_num)) NULL else I(frame_num),
    timeType = time_type,
    items = I(items),
    groups = if (is.null(groups)) NULL else I(groups),
    series = series
  )
}

# The player options shared by every race chart.
# @noRd
race_player_options <- function(frame_dur, ease, autoplay, loop, controls,
                                 start_frame, time_format) {
  if (!is.numeric(frame_dur) || length(frame_dur) != 1 || !(frame_dur > 0)) {
    stop("'frame_dur' must be a positive number of milliseconds")
  }
  if (!is.character(start_frame) && !is.numeric(start_frame)) {
    stop("'start_frame' must be \"first\", \"last\" or a frame number")
  }
  list(
    frameDur = frame_dur,
    ease = ease,
    autoplay = isTRUE(autoplay),
    loop = isTRUE(loop),
    controls = isTRUE(controls),
    startFrame = start_frame,
    timeFormat = time_format
  )
}
