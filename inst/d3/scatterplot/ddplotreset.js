// ddplot shared preamble -- prepended to every chart script by ddplot_script()
// (R/utils.R), so it runs inside the same r2d3 function scope as the chart.
//
// When a Shiny app updates a widget through r2d3::renderD3(), r2d3 re-runs the
// chart script on the *same* root element instead of creating a new one (the
// same happens after a resize). Without this reset, every update is drawn on
// top of the previous chart and its timers keep running.

var ddplotState = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });

// Stop timers registered by the previous render (d3.timer / d3.interval /
// d3.timeout objects, or setInterval / setTimeout ids).
ddplotState.timers.forEach(function (t) {
  try {
    if (t && typeof t.stop === "function") t.stop();
    else clearInterval(t);
  } catch (e) {}
});
ddplotState.timers = [];

// Charts that start long-running timers wrap them with ddplotTrack(...)
function ddplotTrack(t) {
  ddplotState.timers.push(t);
  return t;
}

// Cancel running transitions and wipe the previous render.
r2d3.root.selectAll("*").interrupt().remove();
