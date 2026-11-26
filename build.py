"""Assemble the single-file game page from the sources in src/.

    python3 build.py        writes index.html
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Warband Autobattler</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700;800&family=Grenze+Gotisch:wght@500;600;700&display=swap" rel="stylesheet">
<style>
%s
</style></head><body><div id="app"></div>
<script>
%s
</script>
<script>
%s
</script>
<script>
%s
</script>
<script>
%s
</script>
</body></html>
"""
read = lambda name: (ROOT / "src" / name).read_text()
(ROOT / "index.html").write_text(PAGE % tuple(read(f) for f in ["style.css", "engine.js", "art.js", "portraits.js", "ui.js"]))
print("wrote index.html")
