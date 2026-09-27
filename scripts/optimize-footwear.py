"""Create web copies; keep the artist's PNG originals untouched."""
from pathlib import Path
from PIL import Image

source = Path(__file__).resolve().parents[1] / 'work files/SHOES_AND_CLOSES/NEW look'
destination = source / 'web'
destination.mkdir(exist_ok=True)
before = after = 0
for original in sorted(source.glob('*.png')):
    with Image.open(original) as image:
        image = image.convert('RGBA')
        image.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
        output = destination / (original.stem + '.webp')
        image.save(output, 'WEBP', quality=87, method=6, exact=True)
    before += original.stat().st_size
    after += output.stat().st_size
print(f'{before:,} -> {after:,} bytes; saved {100 * (1 - after / before):.1f}%')
