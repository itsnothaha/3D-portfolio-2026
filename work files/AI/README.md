# AI gallery

The original images and videos are preserved. `web/` contains 480px thumbnail
WebPs, up to 1800px viewing WebPs, and H.264 MP4 copies with fast-start metadata
(maximum dimension 1080px, CRF 25, AAC 96 kbps). Videos load only in the viewer,
never autoplay, and stop when the viewer closes or changes work.

24 images: 9 marketplace A/B tests, 7 banner visuals (including Banner_A5),
8 Salomon personal-project images. Seven matching videos are available;
Salomon5 has no corresponding video and opens as a still image.

Layout and asset paths live in index.html. Captions and viewer behavior are in
../../ai-gallery.js; responsive styling is in ../../ai-gallery.css.
