#' Create a Gantt chart
#'
#' Draws tasks as bars along a time axis, one row per task, from their start
#' to their end. Tasks can be coloured by group, show how far along they are
#' (\code{progress}), depend on other tasks (drawn as arrows) and be compared
#' with today's date. A task that starts and ends on the same date is drawn as
#' a milestone (a diamond).
#'
#' @section Interactions:
#' Hover a task to see its dates, duration and progress, and to highlight the
#' tasks it depends on and the ones that depend on it. Scroll to zoom in time
#' and drag to pan (\code{zoom}); double-click to reset. The bars grow from
#' their start when the chart is drawn. Inside Shiny, clicking a task sets
#' \code{input$<id>_clicked} to a list with \code{task}, \code{start},
#' \code{end} and \code{group}.
#'
#' @param data A data frame with one row per task.
#' @param task The name of the column with the task names.
#' @param start,end The names of the columns with the start and end dates
#'   (Date, POSIXct, or text such as "2025-03-14").
#' @param group Optional. The name of a column to colour the tasks by (a
#'   team, a phase, ...).
#' @param progress Optional. The name of a numeric column with the share of
#'   each task that is done, between 0 and 1.
#' @param depends_on Optional. The name of a column with, for each task, the
#'   name of the task(s) it depends on (several names separated by commas).
#' @param today Optional. A date to mark with a vertical line, or \code{TRUE}
#'   for today's date.
#' @param sort How to order the tasks: \code{"none"} (the order of the rows,
#'   the default), \code{"start"} (by start date) or \code{"group"} (by group,
#'   then by start date).
#' @param colors Optional. Colours of the groups: one per group or a named
#'   vector matched to the groups.
#' @param bar_height The height of the bars as a share of each row. Defaults
#'   to 0.6.
#' @param date_format Optional. A d3 time format for the dates in the tooltip,
#'   such as "\%d/\%m/\%Y". Defaults to "\%b \%-d, \%Y" (with the time when the
#'   dates have one).
#' @param label_font_size The font size of the task names. Defaults to 11.
#' @param zoom Logical. Let the viewer zoom and pan in time. Defaults to TRUE.
#' @param legend Logical. Show a legend of the groups. Defaults to TRUE.
#' @param legend_font_size The font size of the legend. Defaults to 11.
#' @param hover Logical. Show tooltips and highlight on hover. Defaults to TRUE.
#' @param animate Logical. Grow the bars when the chart is drawn. Defaults to
#'   TRUE.
#' @param title Optional. The title of the chart.
#' @param title_font_size The font size of the title. Defaults to 16.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bg_col The background colour. Defaults to "white".
#' @param text_col The colour of the text. Defaults to "#333333".
#' @param width,height Optional. The size of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' plan <- data.frame(
#'   task = c("Kick-off", "Research", "Design", "Prototype", "User tests",
#'            "Build", "QA", "Launch"),
#'   start = as.Date(c("2025-01-06", "2025-01-07", "2025-01-27", "2025-02-17",
#'                     "2025-03-10", "2025-03-03", "2025-04-14", "2025-05-05")),
#'   end = as.Date(c("2025-01-06", "2025-01-31", "2025-02-21", "2025-03-07",
#'                   "2025-03-21", "2025-04-18", "2025-05-02", "2025-05-05")),
#'   team = c("All", "Design", "Design", "Engineering", "Design",
#'            "Engineering", "Engineering", "All"),
#'   done = c(1, 1, 1, 0.8, 0.4, 0.3, 0, 0),
#'   after = c(NA, "Kick-off", "Research", "Design", "Prototype", "Design",
#'             "Build", "QA, User tests")
#' )
#' gantt_chart(plan, task = "task", start = "start", end = "end", group = "team",
#'             progress = "done", depends_on = "after",
#'             today = as.Date("2025-03-14"), title = "Product launch")
#'
#' # The reigns of the last six British monarchs
#' reigns <- data.frame(
#'   monarch = c("Victoria", "Edward VII", "George V", "Edward VIII",
#'               "George VI", "Elizabeth II"),
#'   from = as.Date(c("1837-06-20", "1901-01-22", "1910-05-06", "1936-01-20",
#'                    "1936-12-11", "1952-02-06")),
#'   to = as.Date(c("1901-01-22", "1910-05-06", "1936-01-20", "1936-12-11",
#'                  "1952-02-06", "2022-09-08"))
#' )
#' gantt_chart(reigns, task = "monarch", start = "from", end = "to",
#'             colors = "#a463f2", date_format = "%Y")
#'
#' @export
gantt_chart <- function(
    data,
    task,
    start,
    end,
    group = NULL,
    progress = NULL,
    depends_on = NULL,
    today = NULL,
    sort = c("none", "start", "group"),
    colors = NULL,
    bar_height = 0.6,
    date_format = NULL,
    label_font_size = 11,
    zoom = TRUE,
    legend = TRUE,
    legend_font_size = 11,
    hover = TRUE,
    animate = TRUE,
    title = NULL,
    title_font_size = 16,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col = "white",
    text_col = "#333333",
    width = NULL,
    height = NULL
) {
  ck_df(data)
  ck_col(data, task, "task")
  ck_col(data, start, "start")
  ck_col(data, end, "end")
  ck_col(data, group, "group", null_ok = TRUE)
  ck_col(data, progress, "progress", numeric = TRUE, null_ok = TRUE)
  ck_col(data, depends_on, "depends_on", null_ok = TRUE)
  sort <- match.arg(sort)
  ck_num(bar_height, "bar_height", 0.1, 1)
  for (a in c("zoom", "legend", "hover", "animate")) ck_flag(get(a), a)
  ck_string(date_format, "date_format")
  font <- ck_font(font)

  s <- ck_time(data[[start]], start)
  e <- ck_time(data[[end]], end)
  keep <- !is.na(data[[task]]) & is.finite(s) & is.finite(e)
  if (!any(keep)) stop("'data' has no task with a start and an end")
  if (any(e[keep] < s[keep])) stop("Some tasks end before they start")
  day <- ck_is_day(data[[start]]) && ck_is_day(data[[end]])
  tasks <- data.frame(
    name = as.character(data[[task]])[keep],
    s = s[keep],
    e = e[keep] + if (day) 86400000 else 0,   # a task that ends on a day lasts that day
    stringsAsFactors = FALSE
  )
  tasks$milestone <- s[keep] == e[keep]
  tasks$e[tasks$milestone] <- tasks$s[tasks$milestone]
  groups <- character(0)
  if (!is.null(group)) {
    gv <- data[[group]][keep]
    groups <- ck_levels(gv)
    tasks$g <- match(as.character(gv), groups) - 1L
    tasks$g[is.na(tasks$g)] <- -1L
  }
  if (!is.null(progress)) {
    p <- as.numeric(data[[progress]])[keep]
    tasks$p <- ifelse(is.finite(p), pmin(1, pmax(0, p)), -1)
  }
  ord <- switch(sort,
    none = seq_len(nrow(tasks)),
    start = order(tasks$s, tasks$e),
    group = if (is.null(group)) order(tasks$s, tasks$e) else order(tasks$g, tasks$s, tasks$e))
  tasks <- tasks[ord, , drop = FALSE]
  deps <- NULL
  if (!is.null(depends_on)) {
    dv <- as.character(data[[depends_on]])[keep][ord]
    deps <- lapply(seq_along(dv), function(i) {
      if (is.na(dv[i]) || !nzchar(trimws(dv[i]))) return(list())
      nm <- trimws(strsplit(dv[i], ",", fixed = TRUE)[[1]])
      k <- match(nm, tasks$name)
      if (anyNA(k)) warning("Unknown task(s) in '", depends_on, "': ", paste(nm[is.na(k)], collapse = ", "))
      as.list(k[!is.na(k)] - 1L)
    })
  }
  if (isTRUE(today)) today <- Sys.Date()
  today_ms <- if (is.null(today) || isFALSE(today)) NULL else ck_time(today, "today")[1]

  r2d3::r2d3(
    data = tasks,
    script = chart_script("ganttchart.js"),
    width = width,
    height = height,
    options = list(
      groups = as.list(groups),
      deps = deps,
      today = today_ms,
      day = day,
      colors = ck_colors(colors, if (length(groups)) groups else "all"),
      hasProgress = !is.null(progress),
      barHeight = bar_height,
      dateFormat = date_format,
      labelFontSize = label_font_size,
      zoom = zoom,
      legend = legend,
      legendFontSize = legend_font_size,
      hover = hover,
      animate = animate,
      title = title,
      titleFontSize = title_font_size,
      font = font,
      bgcol = bg_col,
      textCol = text_col
    )
  )
}
