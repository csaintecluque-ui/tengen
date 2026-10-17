import asyncio, time
from playwright.async_api import async_playwright
URL="http://localhost:4173/tengen/"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':393,'height':852}, device_scale_factor=2)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE '+m.type+' '+m.text) if m.type in ('error','warning') else None)
        await pg.goto(URL+"#/jouer"); await pg.wait_for_timeout(800)
        await pg.click("text=Fort"); await pg.wait_for_timeout(300)
        await pg.click("text=Télécharger KataGo")
        t=time.time()
        for i in range(120):
            await pg.wait_for_timeout(1000)
            if await pg.locator("text=Commencer la partie").is_enabled(): break
        print("kata ready after", round(time.time()-t), "s")
        await pg.click("text=Commencer la partie"); await pg.wait_for_timeout(500)
        box = await pg.locator('canvas.goban').bounding_box(); W=box['width']; cell=W/(8+2.1); pad=cell*1.05
        for _ in range(2): await pg.mouse.click(box['x']+pad+4*cell, box['y']+pad+4*cell); await pg.wait_for_timeout(200)
        await pg.wait_for_timeout(6000)
        await pg.click("text=Indice"); await pg.wait_for_timeout(8000)
        await pg.screenshot(path='/tmp/claude-0/shots/8-kata-game.png', full_page=True)
        await pg.click("text=Territoires"); await pg.wait_for_timeout(3000)
        await pg.screenshot(path='/tmp/claude-0/shots/9-own.png')
        print("\n".join(errs) or "no errors")
        await b.close()
asyncio.run(main())
