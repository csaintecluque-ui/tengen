# Icônes d'appli de Tengen (pierres sur le point central, aux couleurs Anamnesis).
# Le sceau Anamnesis · CSC reste en favicon et dans l'appli. Lancer : python3 scripts/make-icons.py
import asyncio
from playwright.async_api import async_playwright
tile = open('public/icons/tile.svg').read()
full = open('scripts/icon-maskable.svg').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, svg, size, transparent in [('icon-192.png', tile, 192, True), ('icon-512.png', tile, 512, True), ('apple-touch-icon-v2.png', full.replace('scale(0.8)', 'scale(0.92)').replace('translate(10.0 10.0)', 'translate(4.0 4.0)'), 180, False), ('icon-512-maskable.png', full, 512, False)]:
            pg = await b.new_page(viewport={'width': size, 'height': size})
            sized = svg.replace('<svg ', f'<svg width="{size}" height="{size}" ', 1)
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{sized}</body></html>')
            await pg.screenshot(path=f'public/icons/{name}', omit_background=transparent)
        await b.close()
asyncio.run(main())
