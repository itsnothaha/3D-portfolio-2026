PORTFOLIO — Daria Marakova

Local preview:
  python -m http.server 8000 --bind 127.0.0.1
  http://localhost:8000/

Pages:
  index.html, about.html, contacts.html, work.html
  work files/CGI-VFX/index.html
  work files/SHOWREEL/index.html
  work files/SHOES_AND_CLOSES/index.html

Assets:
  main page/ — backgrounds, fish animations, portrait, icons and contact GLB
  work files/home_previews/NEW/ — Work category previews
  work files/CGI-VFX/ — web video and preview images
  work files/SHOWREEL/ — web showreels and previews
  work files/SHOES_AND_CLOSES/NEW look/web/ — displayed footwear images
  Fonts/ — local fonts and licenses
  vendor/model-viewer/ — local 3D viewer and license

Development:
  node --test tests/fish-cycle.test.cjs
  scripts/optimize-footwear.py regenerates footwear WebP files from the
  retained PNG inputs in work files/SHOES_AND_CLOSES/NEW look/ (requires Pillow).

Cleanup, 2026-10-02:
  Removed 628 unused files (1.06 GB): obsolete scenes/code, old galleries,
  frame sequences and original media replaced by web copies.
  Runtime-generated fish filenames were checked separately.
  Git history, licenses, tests and footwear optimizer inputs are retained.
  PERFORMANCE.md describes earlier historical measurements; its statements
  about retained original media predate this cleanup.
