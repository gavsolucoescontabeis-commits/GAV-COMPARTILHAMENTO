#!/usr/bin/env python3
"""Cria todos os tamanhos do ícone PWA a partir do leão GAV aprovado."""
from pathlib import Path
import sys
from PIL import Image

site = Path(sys.argv[1])
original = site / "assets" / "gav-leao-master.png"
with Image.open(original) as master:
    source = master.convert("RGB")
    for size, filename in [
        (16, "gav-icon-16.png"),
        (32, "gav-icon-32.png"),
        (192, "gav-icon-192.png"),
        (512, "gav-icon-512.png"),
        (180, "gav-apple-icon.png"),
    ]:
        image = source.resize((size, size), Image.Resampling.LANCZOS)
        image.save(site / "assets" / filename, format="PNG", optimize=True)
    source.resize((256, 256), Image.Resampling.LANCZOS).save(
        site / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
print("Ícones GAV gerados: favicon Windows, 192/512 PWA e Apple 180")
