"""Regenerate the gallery thumbnails in pkgdown/assets/gallery/.

Each thumbnail is a screenshot of the first live example of a chart in the
built chart guides (docs/articles/<guide>.html#<function>). Run it after the
articles have been built, then rebuild the site so the images are copied:

    Rscript -e 'pkgdown::build_articles()'
    python3 pkgdown/thumbnails.py                # every chart
    python3 pkgdown/thumbnails.py line_chart     # only some charts
    Rscript -e 'pkgdown::build_site()'

Requires Python with Playwright (pip install playwright; playwright install chromium).
"""

import functools
import http.server
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
OUT = os.path.join(ROOT, "pkgdown", "assets", "gallery")

GUIDES = {
    "time-series": ["line_chart", "area_chart", "stacked_area_chart", "area_band",
                    "streamgraph", "calendar_heatmap", "anim_line_chart"],
    "comparisons": ["bar_chart", "horz_bar_chart", "lollipop_chart", "horz_lollipop",
                    "dumbbell_chart", "slope_chart", "bump_chart", "waterfall_chart",
                    "radar_chart", "radial_bar_chart", "bar_chart_race"],
    "distributions": ["histogram", "violin_plot", "beeswarm_plot", "ridgeline_plot",
                      "animated_histogram"],
    "relationships": ["scatter_plot", "hexbin_plot", "chord_diagram"],
    "composition": ["pie_chart", "treemap_chart", "waffle_chart", "sunburst_chart",
                    "mosaic_chart", "rose_chart", "parliament_chart"],
    "kpis": ["gauge_chart", "bullet_chart", "liquid_chart", "pulse_grid"],
    "playful": ["heart_fill", "glass_fill", "plant_growth", "flame", "flower"],
}

# Charts that start empty and animate on click.
CLICK = {"anim_line_chart": 11000, "animated_histogram": 3500}
# Charts whose thumbnail uses a later example (0-based index within the section).
INDEX = {"flame": 1}
# Charts that need longer to settle.
WAIT = {"bar_chart_race": 9000, "liquid_chart": 3500, "beeswarm_plot": 3500}


def serve(directory):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(Quiet, directory=directory)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def launch(p):
    try:
        return p.chromium.launch(headless=True)
    except Exception:
        brave = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
        return p.chromium.launch(headless=True, executable_path=brave)


def main(only):
    os.makedirs(OUT, exist_ok=True)
    httpd = serve(DOCS)
    base = "http://127.0.0.1:%d/articles/" % httpd.server_address[1]
    failed = []
    with sync_playwright() as p:
        browser = launch(p)
        for guide, charts in GUIDES.items():
            for fn in charts:
                if only and fn not in only:
                    continue
                page = browser.new_page(viewport={"width": 1100, "height": 900},
                                        color_scheme="light")
                page.goto(base + guide + ".html", wait_until="networkidle")
                widget = page.locator(
                    "xpath=//*[@id='%s']/ancestor-or-self::div[contains(@class,'section')][1]"
                    "//div[contains(@class,'html-widget')]" % fn).nth(INDEX.get(fn, 0))
                if widget.count() == 0:
                    failed.append(fn)
                    page.close()
                    continue
                widget.scroll_into_view_if_needed()
                page.wait_for_timeout(2500)
                if fn in CLICK:
                    box = widget.bounding_box()
                    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                    page.wait_for_timeout(CLICK[fn])
                page.wait_for_timeout(WAIT.get(fn, 0))
                page.mouse.move(0, 0)
                widget.screenshot(path=os.path.join(OUT, fn + ".png"))
                print("ok", fn)
                page.close()
        browser.close()
    httpd.shutdown()
    if failed:
        print("no widget found for:", ", ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    main(set(sys.argv[1:]))
