import asyncio, re
from playwright.async_api import async_playwright
seal = open('scripts/seal.svg').read()
inner = re.sub(r'^<svg[^>]*>|</svg>\s*$', '', seal.strip(), flags=re.S)
tile = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#1B1512"/><g transform="translate(7 7) scale(0.86)">{inner}</g></svg>'
full = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1B1512"/><g transform="translate(14 14) scale(0.72)">{inner}</g></svg>'
open('public/icons/tile.svg','w').write(tile)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, svg, size, transparent in [('icon-192.png', tile, 192, True), ('icon-512.png', tile, 512, True), ('apple-touch-icon.png', full, 180, False), ('icon-512-maskable.png', full, 512, False)]:
            pg = await b.new_page(viewport={'width': size, 'height': size})
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ",1)}</body></html>')
            await pg.screenshot(path=f'public/icons/{name}', omit_background=transparent)
        await b.close()
asyncio.run(main())
