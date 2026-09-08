(() => {
  'use strict';
  const products = window.AOK_PRODUCTS;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const safe = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  // All motion belongs to this round's standalone prototypes.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const activeMotion = new Map();
  function motion(element, frames, duration = 220) {
    if (!element) return;
    activeMotion.get(element)?.cancel();
    if (reducedMotion.matches || !element.animate) return;
    const animation = element.animate(frames, {duration, easing:'cubic-bezier(.22,1,.36,1)'});
    activeMotion.set(element, animation);
    const release = () => {if(activeMotion.get(element) === animation) activeMotion.delete(element);};
    animation.onfinish = release;
    animation.oncancel = release;
  }
  reducedMotion.addEventListener('change', () => {
    if(reducedMotion.matches) {activeMotion.forEach(a => a.cancel());activeMotion.clear();}
  });
  function swapImage(element, source, alt) {
    if(element.getAttribute('src') === source) return;
    activeMotion.get(element)?.cancel();
    element.onload = () => {element.onload = null; motion(element, [{opacity:.55}, {opacity:1}], 240);};
    element.onerror = () => {element.onload = null;};
    if(alt) element.alt = alt;
    element.src = source;
    if(element.complete && element.naturalWidth) {element.onload = null; motion(element, [{opacity:.55}, {opacity:1}], 240);}
  }
  const bag = [];
  let productIndex = 0;
  let choices = {};
  let filter = 'all';
  let toastTimer;
  const art = [
    {file:'a-ok-acc-sota-wheatpaste-photo-realistic.png', name:'Wheatpaste / Art in the wild'},
    {file:'a-ok-hallucinations-face.png', name:'Hallucinations / A familiar face'},
    {file:'chilling-dripped-out-backwards-typewriter.png', name:'Off duty / Infinite keystrokes'}
  ];
  $('[data-concept-label]').textContent = document.body.dataset.concept;
  const notify = message => {
    const el = $('.toast');
    clearTimeout(toastTimer);
    el.textContent = message;
    el.hidden = false;
    motion(el, [{opacity:.5,translate:'0 5px'}, {opacity:1,translate:'0 0'}]);
    toastTimer = setTimeout(() => {el.hidden = true;}, 3200);
  };
  const closeButton = '<button class="close" data-close aria-label="Close dialog">Close ×</button>';
  function show(dialog) {
    $$('dialog[open]').forEach(d => d.close());
    dialog.showModal();
  }
  $$('dialog').forEach(d => d.addEventListener('click', e => {if (e.target === d) {const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  const optionGroups = p => p.options.filter(o => !(o.name === 'Title' && o.values[0] === 'Default Title'));
  function variant() {
    const p = products[productIndex];
    if (optionGroups(p).some(o => !choices[o.name])) return null;
    return p.variants.find(v => optionGroups(p).every(o => v.options.some(x => x.name === o.name && x.value === choices[o.name]))) || null;
  }
  function refreshOptions() {
    const p = products[productIndex];
    $$('[data-option]').forEach(b => {
      b.setAttribute('aria-pressed', String(choices[b.dataset.option] === b.dataset.value));
      b.disabled = !p.variants.some(v => v.available && v.options.some(o => o.name === b.dataset.option && o.value === b.dataset.value) && optionGroups(p).filter(o => o.name !== b.dataset.option && choices[o.name]).every(o => v.options.some(vo => vo.name === o.name && vo.value === choices[o.name])));
    });
    const v = variant();
    const add = $('#add-preview');
    add.disabled = !v?.available;
    add.textContent = v?.available ? `Add to preview bag · ${money(v.price)}` : optionGroups(p).some(o => !choices[o.name]) ? 'Choose your options' : 'Unavailable combination';
    $('#variant-price').textContent = money(v?.price ?? p.price);
    $('#selection-status').textContent = v ? (v.available ? 'Available in the catalog snapshot.' : 'This combination is unavailable.') : 'Select an option in each group.';
  }
  function openProduct(index) {
    productIndex = index;
    choices = {};
    const p = products[index];
    optionGroups(p).forEach(o => {if (o.values.length === 1) choices[o.name] = o.values[0];});
    const dialog = $('#product-dialog');
    dialog.innerHTML = `${closeButton}<div class="dialog-product"><div class="dialog-photo"><img id="detail-image" src="${safe(p.images[0])}" alt="${safe(p.title)}" width="600" height="700"><div class="photo-switch" role="group" aria-label="Product photos">${p.images.map((url,i)=>`<button data-photo="${i}" aria-label="View photo ${i+1}" aria-pressed="${i===0}">${i+1}</button>`).join('')}</div><p class="dialog-note">Catalog photography. Photos are not mapped to selected colors.</p></div><div class="dialog-copy"><p class="eyebrow">${safe(p.category)} / APES ON KEYS</p><h2 id="product-title">${safe(p.title)}</h2><span id="variant-price" class="price">${money(p.price)}</span><p>${safe(p.description.length > 180 ? p.description.slice(0,180).replace(/\s+\S*$/, '') + '…' : p.description)}</p>${optionGroups(p).map(o=>`<fieldset class="option-group"><legend>${safe(o.name)}</legend><div>${[...o.values].sort((a,b)=>o.name==='Size'?['XXS','XS','S','M','L','XL','2XL','3XL'].indexOf(a)-['XXS','XS','S','M','L','XL','2XL','3XL'].indexOf(b):0).map(v=>`<button data-option="${safe(o.name)}" data-value="${safe(v)}" aria-pressed="false">${safe(v)}</button>`).join('')}</div></fieldset>`).join('')}<p id="selection-status" class="dialog-note" aria-live="polite"></p><button class="button" id="add-preview" disabled>Choose your options</button><p class="dialog-note">Concept preview. No payment or order is created. Prices and options come from the local catalog; confirm current details in the store.</p><a href="/products/${safe(p.handle)}" target="_blank" rel="noopener">View in the actual store ↗</a><details class="product-details"><summary>About this piece</summary><p>${safe(p.description)}</p></details><div class="detail-links"><a href="/returns" target="_blank" rel="noopener">Returns policy ↗</a><a href="/terms" target="_blank" rel="noopener">Store terms ↗</a></div>${!p.options.some(o=>o.name==='Size')&&p.category!=='Hats'?'<p class="dialog-note">Sizing is not included in this catalog record. Check the store before purchasing.</p>':''}</div></div>`;
    refreshOptions();
    show(dialog);
  }
  function renderBag() {
    const dialog = $('#bag-dialog');
    const total = bag.reduce((n,item)=>n+item.quantity*item.price,0);
    dialog.innerHTML = `${closeButton}<p class="eyebrow">A–OK / TRY THE BUYING FLOW</p><h2 id="bag-title">Your preview bag</h2><p class="dialog-note">A design preview only. These items are not in the store’s checkout.</p>${bag.length ? bag.map((item,i)=>`<article class="bag-item"><img src="${safe(products[item.index].images[0])}" alt="${safe(products[item.index].name)}" width="74" height="90"><div><h3>${safe(products[item.index].name)}</h3><p>${safe(item.title==='Default Title'?'Standard option':item.title)} · ${money(item.price)}</p><div class="bag-item-actions"><button data-quantity="${i}" data-delta="-1" aria-label="Decrease quantity of ${safe(products[item.index].name)}">−</button><span>${item.quantity}</span><button data-quantity="${i}" data-delta="1" aria-label="Increase quantity of ${safe(products[item.index].name)}">+</button><button data-remove="${i}" aria-label="Remove ${safe(products[item.index].name)}">Remove</button></div><a href="/products/${safe(products[item.index].handle)}" target="_blank" rel="noopener">Buy this piece in the store ↗</a></div></article>`).join('') : '<div class="bag-empty"><p>No pieces yet. Good taste takes a minute.</p></div>'}<div class="bag-total"><span>Subtotal</span><strong>${money(total)}</strong></div><p class="dialog-note">Shipping and tax are not included. The actual store confirms final pricing. Your preview bag stays in this page only.</p><button class="button" data-close>Keep exploring ↗</button>`;
    $$('[data-count]').forEach(el => {el.textContent = bag.reduce((n,item)=>n+item.quantity,0);});
  }
  function updateCatalog(animate = true) {
    const grid = $('.product-grid');
    const cards = $$('.product-card', grid);
    const positions = new Map(cards.filter(c => !c.hidden).map(c => [c, c.getBoundingClientRect()]));
    cards.sort((a,b)=>$('#sort').value==='price'?Number(a.dataset.price)-Number(b.dataset.price):Number(a.dataset.order)-Number(b.dataset.order)).forEach(card=>grid.append(card));
    cards.forEach(card => {card.hidden = filter !== 'all' && card.dataset.category !== filter;});
    if (animate && !reducedMotion.matches) cards.filter(c => !c.hidden).forEach((card,i) => {
      const before = positions.get(card), after = card.getBoundingClientRect();
      const dx = before ? before.left-after.left : 0;
      const dy = before ? before.top-after.top : 0;
      if(!before || dx || dy) motion(card, [{opacity:before?1:.35,transform:`translate(${dx}px,${dy}px)`},{opacity:1,transform:'translate(0,0)'}], 230 + Math.min(i*20,80));
    });
    const count = cards.filter(c=>!c.hidden).length;
    $('.results').textContent = `${count} ${count===1?'piece':'pieces'} shown.`;
    $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  }
  $$('.product-card').forEach((card,i)=>{card.dataset.order=i;});
  $('#sort').addEventListener('change', updateCatalog);
  updateCatalog(false);
  $('.menu-button').addEventListener('click', e => {
    const menu = $('#mobile-menu');
    menu.hidden = !menu.hidden;
    e.currentTarget.setAttribute('aria-expanded', String(!menu.hidden));
    e.currentTarget.textContent = menu.hidden ? 'Menu +' : 'Close −';
  });
  $$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>{$('#mobile-menu').hidden=true;$('.menu-button').setAttribute('aria-expanded','false');$('.menu-button').textContent='Menu +';}));
  function openStudio() {
    const dialog = $('#studio-dialog');
    dialog.innerHTML = `${closeButton}<div class="studio-workspace"><div><p class="eyebrow">Chaos Monkeys / Image generator concept</p><h2 id="studio-title">What if the ape…</h2><p>One small idea. Many possible mistakes.</p><label for="art-prompt">Your starting point</label><textarea id="art-prompt" maxlength="500">An A-OK ape taking a break from infinite compute.</textarea><label for="art-style">Art direction</label><select id="art-style"><option value="0">Wheatpaste on the street</option><option value="1">A familiar hallucination</option><option value="2">Off-duty typewriter club</option></select><button class="button" id="preview-art">Preview sample ↗</button><p class="dialog-note">This prototype shows existing A-OK artwork for each direction. It does not generate a new image from your prompt or send data to a model.</p><button class="text-button" id="copy-prompt">Copy my prompt</button><p id="copy-status" class="dialog-note" aria-live="polite"></p></div><div class="studio-result"><img id="sample-art" src="/images/hp-art-grid-collection/${art[0].file}" alt="${art[0].name}" width="600" height="600"><p id="sample-caption" aria-live="polite">EXISTING ARTWORK / ${art[0].name}</p><a href="/gallery" target="_blank" rel="noopener">See the self-replicating art archive ↗</a><button class="button" data-product="0">Back to something wearable ↗</button></div></div>`;
    show(dialog);
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-close')) {b.closest('dialog').close();return;}
    if (b.hasAttribute('data-product')) {openProduct(Number(b.dataset.product));return;}
    if (b.hasAttribute('data-option')) {choices[b.dataset.option] = b.dataset.value;refreshOptions();motion(b,[{transform:'scale(.94)'},{transform:'scale(1)'}],160);return;}
    if (b.hasAttribute('data-photo')) {
      swapImage($('#detail-image'), products[productIndex].images[Number(b.dataset.photo)]);
      $$('[data-photo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return;
    }
    if (b.id === 'add-preview') {
      const v = variant();if(!v?.available)return;
      const old = bag.find(item=>item.id===v.id);
      if(old)old.quantity++;else bag.push({id:v.id,index:productIndex,title:v.title,price:v.price,quantity:1});
      renderBag();show($('#bag-dialog'));motion($('.bag-total strong'),[{opacity:.4,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}]);notify(`${products[productIndex].name} added to preview bag.`);return;
    }
    if(b.hasAttribute('data-bag')){renderBag();show($('#bag-dialog'));return;}
    if(b.hasAttribute('data-remove')){bag.splice(Number(b.dataset.remove),1);renderBag();$('#bag-dialog .close').focus();notify('Piece removed.');return;}
    if(b.hasAttribute('data-quantity')){
      const i=Number(b.dataset.quantity);bag[i].quantity+=Number(b.dataset.delta);
      if(bag[i].quantity<=0)bag.splice(i,1);
      renderBag();$('#bag-dialog .close').focus();motion($('.bag-total strong'),[{opacity:.4},{opacity:1}]);return;
    }
    if(b.hasAttribute('data-filter')){filter=b.dataset.filter;updateCatalog();return;}
    if(b.hasAttribute('data-density')){$('.product-grid').classList.toggle('list',b.dataset.density==='list');$$('[data-density]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));motion($('.product-grid'),[{opacity:.55},{opacity:1}],180);return;}
    if(b.hasAttribute('data-feature')){
      const i=Number(b.dataset.feature),p=products[i];
      swapImage($('#club-image img'),p.images[0],p.title);motion($('.club-stamp'),[{transform:'rotate(4deg) scale(.96)'},{transform:'rotate(4deg) scale(1)'}],260);
      $('#club-product').textContent=`${p.name} · ${money(p.price)}`;
      $('#club-buy').dataset.product=i;
      $$('[data-feature]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return;
    }
    if(b.hasAttribute('data-studio')){openStudio();return;}
    if(b.id==='preview-art'){
      const a=art[Number($('#art-style').value)];
      swapImage($('#sample-art'),`/images/hp-art-grid-collection/${a.file}`,a.name);
      $('#sample-caption').textContent=`SAMPLE PREVIEW / ${a.name} — existing artwork, not generated from your prompt.`;return;
    }
    if(b.id==='copy-prompt'){
      const prompt=$('#art-prompt');
      try{await navigator.clipboard.writeText(`${prompt.value}\nArt direction: ${$('#art-style').selectedOptions[0].textContent}`);$('#copy-status').textContent='Prompt copied.';b.textContent='Copied ✓';}
      catch{prompt.focus();prompt.select();$('#copy-status').textContent='Select and copy the prompt text above.';}return;
    }
    if(b.hasAttribute('data-art')){
      const a=art[Number(b.dataset.art)];const dialog=$('#art-dialog');
      dialog.innerHTML=`${closeButton}<div class="art-detail"><img src="/images/hp-art-grid-collection/${a.file}" alt="${safe(a.name)}" width="700" height="700"><p>${safe(a.name)} / From the A-OK art archive.</p></div>`;show(dialog);return;
    }
    if(b.hasAttribute('data-game')){
      let dialog=$('#game-dialog');
      if(!dialog){dialog=document.createElement('dialog');dialog.id='game-dialog';dialog.setAttribute('aria-labelledby','game-title');document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.innerHTML='';});}
      dialog.innerHTML=`${closeButton}<p class="eyebrow">Optional side quest</p><h2 id="game-title" style="font-size:32px;margin-bottom:20px">Run, Human, Run!</h2><iframe src="/game" title="Run, Human, Run! embedded game" style="width:100%;height:60dvh;border:1px solid var(--line)"></iframe><p class="dialog-note">The existing game, loaded only when opened. <a href="/game" target="_blank" rel="noopener">Open full screen ↗</a></p>`;
      show(dialog);
    }
  });
})();
