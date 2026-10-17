import asyncio, sys
from playwright.async_api import async_playwright
URL="http://localhost:4173/tengen/"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':393,'height':852}, device_scale_factor=2, color_scheme=sys.argv[1] if len(sys.argv)>1 else 'light')
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE '+m.text) if m.type=='error' else None)
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='/tmp/claude-0/shots/1-learn.png')
        await pg.goto(URL+"#/lecon/libertes"); await pg.wait_for_timeout(600)
        await pg.click("text=4"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/claude-0/shots/2-lesson.png', full_page=True)
        await pg.goto(URL+"#/problemes"); await pg.wait_for_timeout(600)
        await pg.screenshot(path='/tmp/claude-0/shots/3-problems.png')
        await pg.goto(URL+"#/jouer"); await pg.wait_for_timeout(600)
        await pg.screenshot(path='/tmp/claude-0/shots/4-play.png', full_page=True)
        await pg.click("text=Commencer la partie"); await pg.wait_for_timeout(500)
        box = await pg.locator('canvas.goban').bounding_box(); W=box['width']; cell=W/(8+2.1); pad=cell*1.05
        for _ in range(2): await pg.mouse.click(box['x']+pad+2*cell, box['y']+pad+6*cell); await pg.wait_for_timeout(200)
        await pg.wait_for_timeout(4000)
        await pg.screenshot(path='/tmp/claude-0/shots/5-game.png', full_page=True)
        await pg.goto(URL+"#/bibliotheque"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/claude-0/shots/6-lib.png')
        await pg.goto(URL+"#/reglages"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/claude-0/shots/7-settings.png', full_page=True)
        print("\n".join(errs) or "no errors")
        await b.close()
asyncio.run(main())
