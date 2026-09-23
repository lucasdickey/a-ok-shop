const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.AOK_PREVIEW_URL || 'http://localhost:3016';
(async()=>{
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.goto(`${origin}/concepts`);
    const list=page.getByRole('group',{name:'Concept list'});
    assert.equal(await list.getByRole('button').count(),3);
    assert.match(await page.locator('iframe').last().getAttribute('src'),/24-print-room/);
    await page.getByRole('button',{name:'Expand ⤢',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('dialog').locator('button[aria-label="Next concept"]:visible').click();
    assert.match(await page.locator('iframe').last().getAttribute('src'),/25-human-edit/);
    await page.getByRole('dialog').locator('button[aria-label="Next concept"]:visible').click();
    assert.match(await page.locator('iframe').last().getAttribute('src'),/26-off-model/);
    await page.getByRole('button',{name:'Close fullscreen',exact:true}).click();
    await page.getByRole('button',{name:'All',exact:true}).click();
    assert.equal(await list.getByRole('button').count(),26);
    await list.getByRole('button',{name:/16 Human Standard/}).click();
    assert.match(await page.locator('iframe').last().getAttribute('src'),/16-human-standard/);
    await list.getByRole('button',{name:/20 The Living Index/}).click();
    assert.match(await page.locator('iframe').last().getAttribute('src'),/20-living-index/);
    await page.getByRole('button',{name:'Codex · Astra · Round 5',exact:true}).click();
    await page.getByRole('button',{name:'Mobile',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('iframe').getBoundingClientRect().width===388);
    await page.screenshot({path:'/tmp/aok-round-five-evidence/gallery-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Gallery fits narrow view');
    await page.screenshot({path:'/tmp/aok-round-five-evidence/gallery-mobile.png',fullPage:true});
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      await page.getByRole('button',{name:'Expand ⤢',exact:true}).click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('dialog').locator('button[aria-label="Next concept"]:visible').click();
      await page.getByRole('dialog').locator('button[aria-label="Previous concept"]:visible').click();
      await page.getByRole('dialog').frameLocator('iframe').locator('.masthead').waitFor();
      assert.equal(await page.getByRole('dialog').locator('button[aria-label="Next concept"]:visible').isVisible(),true);
      assert.equal(await page.getByRole('dialog').locator('iframe').evaluate(el=>el.contentDocument.documentElement.scrollWidth<=el.contentWindow.innerWidth),true,`Fullscreen prototype fits ${width}px`);
      await page.screenshot({path:`/tmp/aok-round-five-evidence/gallery-fullscreen-${width}.png`});
      await page.getByRole('button',{name:'Close fullscreen',exact:true}).click();
    }
    fs.writeFileSync('/tmp/aok-round-five-evidence/gallery-verification.json',JSON.stringify({entries:26,astraRoundFive:3,fullscreen:'desktop and 390/320px touch navigation: entered, advanced, returned, exited',baselines:'16 and 20 selectable',mobilePreviewFrameWidth:390,iframeWidth:388,narrowGallery:'no horizontal overflow'},null,2));
    console.log('PASS gallery: 26 entries, distinct three-entry Astra filter, fullscreen comparison, baseline selection, 390px preview and mobile layout');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
