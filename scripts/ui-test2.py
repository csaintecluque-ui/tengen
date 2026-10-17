import asyncio
from playwright.async_api import async_playwright
URL="http://localhost:4173/tengen/"
def pt(box, n, x, y, coords=True):
    padF=1.05 if coords else 0.62; W=box['width']; cell=W/(n-1+2*padF); pad=cell*padF
    return box['x']+pad+x*cell, box['y']+pad+y*cell
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':393,'height':852}, device_scale_factor=2)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto(URL+"#/lecon/echelle"); await pg.wait_for_timeout(700)
        box = await pg.locator('canvas.goban').bounding_box()
        await pg.mouse.click(*pt(box,9,5,4)); await pg.wait_for_timeout(6000)  # F5
        await pg.screenshot(path='/tmp/claude-0/shots/10-ladder.png', full_page=True)
        await pg.goto(URL+"#/probleme/ld-bulky5"); await pg.wait_for_timeout(700)
        box = await pg.locator('canvas.goban').bounding_box()
        await pg.mouse.click(*pt(box,9,1,8)); await pg.wait_for_timeout(1500)  # B1 wrong
        await pg.screenshot(path='/tmp/claude-0/shots/11-problem-wrong.png', full_page=True)
        # partie locale rapide jusqu'au décompte
        await pg.goto(URL+"#/jouer"); await pg.wait_for_timeout(500)
        await pg.click("text=À deux"); await pg.click("text=Commencer la partie"); await pg.wait_for_timeout(500)
        box = await pg.locator('canvas.goban').bounding_box()
        for y in range(9):
            for x in (3,5):
                for _ in range(2): await pg.mouse.click(*pt(box,9,x,y)); await pg.wait_for_timeout(40)
        await pg.click("text=Passer"); await pg.wait_for_timeout(200); await pg.click("text=Passer"); await pg.wait_for_timeout(3000)
        await pg.click("text=Valider le score"); await pg.wait_for_timeout(500)
        await pg.click("text=Analyser la partie"); await pg.wait_for_timeout(500)
        await pg.click("text=Analyser la partie"); await pg.wait_for_timeout(40000)
        await pg.screenshot(path='/tmp/claude-0/shots/12-review.png', full_page=True)
        print("\n".join(errs) or "no errors")
        await b.close()
asyncio.run(main())
