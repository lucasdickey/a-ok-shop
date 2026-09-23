// Run with a local server: PLAYWRIGHT_MODULE=/path/to/playwright node session/0923-astra-round-five/verify.cjs
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const origin = process.env.AOK_PREVIEW_URL || 'http://localhost:3015';
const output = process.env.AOK_EVIDENCE_DIR || '/tmp/aok-round-five-evidence';
const targets = ['16-human-standard', '20-living-index', '24-print-room', '25-human-edit', '26-off-model'];
fs.mkdirSync(output, {recursive:true});
const hashes = require('./original-hashes.json');
for (const [file, hash] of Object.entries(hashes)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'public/design-concepts',file))).digest('hex'),hash,`Original preserved: ${file}`);
const snapshot = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'public/design-concepts/astra-round-five-data.js'),'utf8'),snapshot);
const products = JSON.parse(JSON.stringify(snapshot.window.AOK_ROUND_FIVE));
const baseline = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'public/design-concepts/round-four-data.js'),'utf8'),baseline);
assert.deepEqual(products,JSON.parse(JSON.stringify(baseline.window.AOK_PRODUCTS)),'Same six products as concepts 16 and 20');
const catalog = require(path.join(root,'product-catalog.json')).products.edges.map(e=>e.node);
assert.equal(products.length,6);
for(const p of products){
  const source = catalog.find(s=>s.handle===p.handle);
  assert.deepEqual(p.options,source.options.map(o=>({name:o.name,values:o.values})));
  assert.deepEqual(p.variants,source.variants.edges.map(({node:v})=>({id:v.id,title:v.title,price:Number(v.price.amount),available:v.availableForSale,options:v.selectedOptions})));
  assert.deepEqual(p.images,source.images.edges.map(e=>e.node.url));
  assert.equal(p.price,Number(source.priceRange.minVariantPrice.amount));
}
const result = {catalog:'Six products match source prices, variants, availability, options and photos', originals:`${Object.keys(hashes).length} original files unchanged`, flows:[], responsive:[], errors:[]};

(async()=>{
  const browser = await chromium.launch();
  try {
    for(const width of [1440,390]) for(const target of targets){
      const current = Number(target.slice(0,2))>=21;
      const context = await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
      const page = await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
      await page.goto(`${origin}/design-concepts/${target}.html`);
      await page.locator('.product-card').first().waitFor();
      assert.equal(await page.locator('.product-card').count(),6);
      if(target==='25-human-edit')assert.equal(await page.locator('.product-card h2').count(),6,'Collection-first cards follow h1');
      assert.match(await page.locator('.product-card').first().innerText(),/Hallucination Club[\s\S]*\$45/);
      const productTrigger = page.locator('.product-card [data-product="0"]').first();
      await productTrigger.click();
      assert.match(await page.locator('#product-title').innerText(),/HALLUCINATION CLUB/);
      assert.equal(await page.locator('#add-preview').isDisabled(),true);
      const purple = page.locator('[data-option="Color"][data-value="Purple"]');
      if(current){
        assert.equal(await purple.getAttribute('aria-disabled'),'true');
        await purple.focus();await page.keyboard.press('Enter');assert.match(await page.locator('#selection-status').innerText(),/unavailable/);
        assert.equal(await page.locator('#add-preview').isDisabled(),true);
      } else assert.equal(await purple.isDisabled(),true);
      await page.locator('[data-option="Color"][data-value="Green"]').click();
      await page.locator('[data-option="Size"][data-value="M"]').click();
      assert.equal(await page.locator('#add-preview').isDisabled(),false);
      await page.locator('#add-preview').focus();await page.keyboard.press('Enter');
      if(current){
        assert.match(await page.locator('#add-status').innerText(),/added to preview bag/);
        assert.equal(await page.locator('#add-preview').evaluate(el=>el===document.activeElement),true);
        await page.locator('#product-dialog [data-bag]').click();
      }
      await page.locator('#bag-dialog[open]').waitFor();
      assert.match(await page.locator('#bag-dialog').innerText(),/Green \/ M/);
      const plus = page.locator('[data-delta="1"]');await plus.focus();await page.keyboard.press('Enter');
      assert.match(await page.locator('.bag-total').innerText(),/\$90/);
      const quantityFocus = await plus.evaluate(el=>el===document.activeElement);
      if(current)assert.equal(quantityFocus,true);
      await page.locator('[data-delta="-1"]').click();
      assert.match(await page.locator('.bag-total').innerText(),/\$45/);
      await page.locator('[data-remove]').click();
      assert.match(await page.locator('.bag-total').innerText(),/\$0/);
      if(current){
        assert.equal(await page.locator('#keep-shopping').evaluate(el=>el===document.activeElement),true);
        assert.equal(await page.locator('#bag-empty').isVisible(),true);
      }
      await page.locator('#bag-dialog .close').click();
      if(current){
        await page.waitForFunction(()=>document.activeElement.matches('#product-dialog [data-bag]'));
        await page.locator('#product-dialog [data-inspect]').click();
        assert.match(await page.locator('#inspect-caption').innerText(),/Alternate photograph 2/);
        await page.locator('[data-inspect-photo="0"]').click();
        assert.match(await page.locator('#inspect-caption').innerText(),/photograph 1/);
        await page.keyboard.press('Escape');
        await page.waitForFunction(()=>document.activeElement.matches('#product-dialog [data-inspect]'));
        await page.locator('#product-dialog .close').click();
        await page.waitForFunction(()=>document.activeElement.matches('.product-card [data-product="0"]'));
      }
      await page.locator('[data-art="0"]').click();
      await page.locator(current?'#inspect-dialog[open]':'#art-dialog[open]').waitFor();
      await page.keyboard.press('Escape');
      if(target==='24-print-room'){
        const generator = page.locator('[data-generator]');
        await generator.focus();
        assert.equal(await generator.evaluate(el=>getComputedStyle(el).outlineColor),'rgb(255, 255, 255)','Visible white focus ring on crimson generator card');
      }
      await page.locator(current?'[data-generator]':'[data-studio]').first().click();
      const generatorText=await page.locator(current?'#generator-dialog':'#studio-dialog').innerText();
      assert.match(generatorText,/existing/i);
      if(current){
        assert.match(generatorText,/Existing-sample generator preview/);
        await page.locator('#sample-choice').selectOption('2');
        const displayed = await page.locator('#sample-image').getAttribute('src');
        await page.locator('#inspect-sample').click();
        assert.equal(await page.locator('#inspect-dialog img').getAttribute('src'),displayed,'Inspect follows displayed art before Show');
        await page.keyboard.press('Escape');
        await page.locator('#show-sample').click();
        assert.match(await page.locator('#sample-status').innerText(),/Existing sample 3/);
        await page.locator('#inspect-sample').click();
        assert.equal(await page.locator('#inspect-dialog img').getAttribute('src'),await page.locator('#sample-image').getAttribute('src'),'Inspect follows displayed art after Show');
        await page.keyboard.press('Escape');
        await page.waitForFunction(()=>document.activeElement.id==='inspect-sample');
      }
      await page.keyboard.press('Escape');
      const hats = page.locator('[data-filter="Hats"]');await hats.focus();await page.keyboard.press('Enter');
      assert.equal(await page.locator('.product-card:visible').count(),1);
      assert.equal(await hats.evaluate(el=>el===document.activeElement),true);
      if(current)assert.match(await page.locator('#results').innerText(),/1 piece/);
      await page.locator('[data-filter="all"]').click();
      if(width===390){
        await page.locator(current?'#menu-toggle':'.menu-button').click();
        assert.equal(await page.locator('#mobile-menu').isVisible(),true);
        await page.locator('#mobile-menu a').first().click();
        assert.equal(await page.locator('#mobile-menu').isVisible(),false);
        if(current)assert.equal(await page.locator('#shop').evaluate(el=>el===document.activeElement),true);
      }
      if(current){
        // Missing-size catalog records remain honest; photo switches do not change color selection.
        await page.locator('.product-card [data-product="1"]').first().click();
        assert.equal(await page.locator('[data-option="Size"]').count(),0);
        assert.match(await page.locator('#product-dialog').innerText(),/No size choices/);
        await page.locator('[data-option="Color"][data-value="Black"]').click();
        await page.locator('[data-photo="1"]').click();
        assert.equal(await page.locator('[data-option="Color"][data-value="Black"]').getAttribute('aria-pressed'),'true');
        await page.keyboard.press('Escape');
      }
      if(target==='26-off-model'){
        await page.locator('[data-feature="2"]').click();
        await page.waitForFunction(()=>document.querySelector('#campaign-buy').dataset.product==='2');
        assert.equal(await page.locator('#campaign-name').innerText(),'Day 2 Monkey Hoodie');
        assert.equal(await page.locator('#campaign-price').innerText(),'$75');
        assert.equal(await page.locator('#campaign-buy').getAttribute('data-product'),'2');
        assert.match(await page.locator('#campaign-image').getAttribute('src'),/same-vibes/);
        await page.locator('[data-campaign-photo="2"]').click();
        await page.waitForFunction(()=>document.querySelector('[data-campaign-photo="2"]').getAttribute('aria-pressed')==='true');
        assert.match(await page.locator('#campaign-image').getAttribute('src'),/same-vibes-but-more-2.jpg/);
        await page.locator('#campaign-buy').click();assert.match(await page.locator('#product-title').innerText(),/DAY 2 MONKEY HOODIE/);
        await page.keyboard.press('Escape');
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${target} no overflow at ${width}`);
      assert.deepEqual(errors,[]);assert.deepEqual(writes,[],'Preview never writes to a commerce service');
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:path.join(output,`${target}-${width}.png`),fullPage:true});
      result.flows.push({target,width,tasks:'find price, unavailable option, select variant, add, increase, decrease, remove, inspect art, generator, return, filter, mobile menu: PASS',quantityFocus:quantityFocus?'retained':'baseline resets to Close',commerceWrites:writes.length});
      console.log(`PASS ${target} / ${width}; quantity focus ${quantityFocus?'retained':'resets to Close (baseline)'}`);
      await context.close();
    }
    for(const target of targets.slice(2))for(const width of [320,768]){
      const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',hasTouch:true});const page=await context.newPage();
      await page.goto(`${origin}/design-concepts/${target}.html`);
      await page.locator('[data-filter="Hats"]').click();
      assert.equal(await page.evaluate(()=>document.getAnimations().length),0,'Reduced motion disables all animation');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.locator('[data-bag]').first().click();assert.equal(await page.locator('#bag-empty').isVisible(),true);
      await page.keyboard.press('Escape');
      await page.locator('.product-card [data-product="3"]').first().click();
      await page.locator('#add-preview').click();await page.locator('#product-dialog [data-bag]').click();
      await page.locator('[data-delta="-1"]').focus();await page.keyboard.press('Enter');assert.match(await page.locator('#bag-status').innerText(),/Minimum quantity/);
      assert.match(await page.locator('.bag-total').innerText(),/\$75/);
      assert.equal(await page.locator('#bag-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
      // Native modal tab containment, including repeated wraps.
      for(let i=0;i<18;i++)await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#bag-dialog')),true);
      await page.screenshot({path:path.join(output,`${target}-${width}-bag.png`)});
      result.responsive.push({target,width,reducedMotion:'PASS',emptyBag:'PASS',minimumQuantity:'PASS',focusTrap:'PASS',horizontalOverflow:false});await context.close();
    }
    // Delayed or failed campaign photographs must never mismatch the purchase target.
    {
      const context=await browser.newContext();const page=await context.newPage();
      let releasePhoto;
      const heldPhoto=new Promise(resolve=>{releasePhoto=resolve;});
      await page.route('**/same-vibes-but-more-1.png',async route=>{await heldPhoto;await route.continue();});
      await page.goto(`${origin}/design-concepts/26-off-model.html`);
      await page.locator('[data-feature="2"]').click();
      await page.waitForFunction(()=>document.querySelector('.diptych').getAttribute('aria-busy')==='true');
      assert.equal(await page.locator('#campaign-buy').getAttribute('data-product'),'1');
      assert.equal(await page.locator('#campaign-price').innerText(),'$50');
      await page.locator('[data-feature="0"]').click();
      await page.waitForFunction(()=>document.querySelector('#campaign-buy').dataset.product==='0');
      const delayedResponse=page.waitForResponse(response=>response.url().endsWith('/same-vibes-but-more-1.png'));
      releasePhoto();await (await delayedResponse).finished();
      assert.equal(await page.locator('#campaign-buy').getAttribute('data-product'),'0');
      assert.equal(await page.locator('#campaign-price').innerText(),'$45');
      assert.match(await page.locator('#campaign-image').getAttribute('src'),/hallucination-club/);
      await context.close();
      const failureContext=await browser.newContext();const failurePage=await failureContext.newPage();
      await failurePage.route('**/same-vibes-but-more-1.png',route=>route.abort());
      await failurePage.goto(`${origin}/design-concepts/26-off-model.html`);
      await failurePage.locator('[data-feature="2"]').click();
      await failurePage.waitForFunction(()=>document.querySelector('#campaign-status').textContent.includes('could not load'));
      assert.equal(await failurePage.locator('#campaign-buy').getAttribute('data-product'),'1');
      assert.equal(await failurePage.locator('#campaign-price').innerText(),'$50');
      assert.match(await failurePage.locator('#campaign-image').getAttribute('src'),/monkey-master/);
      result.campaignNetwork='PASS: old selection retained during delay/failure; latest request wins';
      await failureContext.close();
    }
    {
      const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
      await page.goto(`${origin}/design-concepts/25-human-edit.html`);
      for(const index of ['0','3','1','4']){
        await page.locator(`.editorial-pairs [data-inspect="${index}"]`).click();
        assert.equal(await page.locator('#inspect-title').innerText(),products[Number(index)].name);
        await page.keyboard.press('Escape');
      }
      await page.screenshot({path:path.join(output,'25-human-edit-390.png'),fullPage:true});
      result.editorialPairs='PASS: all four notes open the correct specific garment';await context.close();
    }
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(result,null,2));
    console.log('All 18 browser scenarios passed; original prototypes preserved and catalog parity confirmed.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
