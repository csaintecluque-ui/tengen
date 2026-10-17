import asyncio, random
from playwright.async_api import async_playwright
URL="http://localhost:4173/tengen/"
def pt(box, n, x, y):
    W=box['width']; cell=W/(n-1+2.1); pad=cell*1.05
    return box['x']+pad+x*cell, box['y']+pad+y*cell
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':393,'height':852}, device_scale_factor=2)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto(URL+"#/reglages"); await pg.wait_for_timeout(600)
        await pg.click("text=ChatGPT"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/claude-0/shots/20-ai-settings.png', full_page=True)
        await pg.goto(URL+"#/jouer"); await pg.wait_for_timeout(500)
        await pg.click("text=Débutant"); await pg.click("text=Un seul toucher") if await pg.locator("text=Un seul toucher").count() else None
        await pg.click("text=Commencer la partie"); await pg.wait_for_timeout(500)
        random.seed(3)
        for k in range(14):
            box = await pg.locator('canvas.goban').bounding_box()
            for t in range(6):
                x,y=random.randint(1,7),random.randint(1,7)
                await pg.mouse.click(*pt(box,9,x,y)); await pg.wait_for_timeout(120)
                await pg.mouse.click(*pt(box,9,x,y)); await pg.wait_for_timeout(150)
                if await pg.locator("text=L'ordinateur réfléchit").count(): break
            for w in range(40):
                await pg.wait_for_timeout(300)
                if not await pg.locator("text=L'ordinateur réfléchit").count(): break
        await pg.click("text=Abandonner"); await pg.click("text=Confirmer l'abandon"); await pg.wait_for_timeout(400)
        await pg.click("text=Analyser la partie"); await pg.wait_for_timeout(400)
        await pg.click("text=Standard"); await pg.click("button:has-text('Analyser la partie')")
        for w in range(200):
            await pg.wait_for_timeout(1500)
            if await pg.locator("text=Bilan chiffré").count(): break
        await pg.wait_for_timeout(500)
        await pg.locator("input[type=range]").fill("0"); await pg.wait_for_timeout(300)
        await pg.click("text=Erreur suiv."); await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/claude-0/shots/21-review.png', full_page=True)
        if await pg.locator("text=Voir la suite").count():
            await pg.locator("text=Voir la suite").first.click(); await pg.wait_for_timeout(4000)
            await pg.screenshot(path='/tmp/claude-0/shots/22-pv.png')
        print("\n".join(errs) or "no errors")
        await b.close()
asyncio.run(main())
