#!/usr/bin/env python3

import argparse
import math
from pathlib import Path
from PIL import Image


TILE_SIZE = 256
MAX_ZOOM = 7


def generate_tiles(source, output, zoom):
    source = Path(source)
    output = Path(output)

    img = Image.open(source).convert("RGBA")
    print(
        f"image width={img.width}, height={img.height}"
    )

    # z=7 is the source/native resolution.
    # Each lower zoom reduces dimensions by 2.
    scale = 2 ** (zoom - MAX_ZOOM)

    width = max(1, math.ceil(img.width * scale))
    height = max(1, math.ceil(img.height * scale))

    print(
        f"scale width={width}, scale height={height}"
    )

    if (width, height) != img.size:
        img = img.resize(
            (width, height),
            Image.Resampling.LANCZOS
        )

    # Pad to complete 256x256 tiles.
    padded_width = math.ceil(width / TILE_SIZE) * TILE_SIZE
    padded_height = math.ceil(height / TILE_SIZE) * TILE_SIZE

    print(
        f"padded width={padded_width}, padded height={padded_height}"
    )

    if (padded_width, padded_height) != (width, height):
        padded = Image.new(
            "RGBA",
            (padded_width, padded_height),
            (0, 0, 0, 0)
        )
        padded.paste(img, (0, 0))
        img = padded

    zoom_dir = output / str(zoom)

    tiles_x = img.width // TILE_SIZE
    tiles_y = img.height // TILE_SIZE

    for x in range(tiles_x):
        x_dir = zoom_dir / str(x)
        x_dir.mkdir(parents=True, exist_ok=True)

        for y in range(tiles_y):
            tile = img.crop((
                x * TILE_SIZE,
                y * TILE_SIZE,
                (x + 1) * TILE_SIZE,
                (y + 1) * TILE_SIZE
            ))

            tile.save(
                x_dir / f"{y}.png",
                optimize=True
            )

    print(
        f"z={zoom}: "
        f"{tiles_x}x{tiles_y} tiles "
        f"({img.width}x{img.height}px)"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Generate Leaflet L.CRS.Simple map tiles."
    )

    parser.add_argument(
        "source",
        help="Source PNG image"
    )

    parser.add_argument(
        "--zoom",
        "-z",
        type=int,
        nargs="+",
        required=True,
        help="Zoom level(s) to generate, e.g. --zoom 3 or --zoom 0 1 2 3"
    )

    parser.add_argument(
        "--output",
        "-o",
        default="tiles",
        help="Output directory (default: tiles)"
    )

    args = parser.parse_args()

    for zoom in args.zoom:
        if not 0 <= zoom <= MAX_ZOOM:
            parser.error(
                f"Zoom must be between 0 and {MAX_ZOOM}: {zoom}"
            )

    for zoom in sorted(set(args.zoom)):
        generate_tiles(
            args.source,
            args.output,
            zoom
        )


if __name__ == "__main__":
    main()