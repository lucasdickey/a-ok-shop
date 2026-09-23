(() => {
  'use strict';
  const products = window.AOK_ROUND_FIVE;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const safe = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const priceFormats = [0,2].map(maximumFractionDigits => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits}));
  const money = n => priceFormats[n % 1 ? 1 : 0].format(n);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  function motion(node, frames) {
    if (reduced.matches || !node.animate) return;
    const animation = node.animate(frames, {duration:180, easing:'ease-out'});
    animations.add(animation);
    animation.onfinish = animation.oncancel = () => animations.delete(animation);
  }
  reduced.addEventListener('change', () => {if (reduced.matches) animations.forEach(a => a.cancel());});
  const art = window.AOK_ROUND_FIVE_ART;
  const artPath = a => `/images/hp-art-grid-collection/${a.file}`;
  const bag = [];
  let productIndex = 0, choices = {}, campaignIndex = 1, campaignRequest = 0, inspectProduct = null, sampleIndex = 0;
  const dialogTop = label => `<div class="dialog-top"><p class="micro">${label}</p><button class="close" data-close>Close ×</button></div>`;
  // Native modal stacking keeps the product state intact beneath bag / inspection.
  // Each close restores its exact trigger, including Escape and nested dialogs.
  const openers = new WeakMap();
  function show(dialog, trigger) {
    openers.set(dialog, trigger || document.activeElement);
    dialog.showModal();
    $('.close', dialog).focus();
  }
  function closeDialog(dialog) {
    dialog.close();
    const opener = openers.get(dialog);
    if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus();
    else $('#shop').focus();
  }
  // Restore synchronously. An asynchronous close listener can steal focus from
  // the user's next control after Escape has already dismissed the dialog.
  $$('dialog').forEach(dialog => dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog(dialog);
  }));
  const groups = p => p.options.filter(o => !(o.name === 'Title' && o.values[0] === 'Default Title'));
  const initialChoices = p => Object.fromEntries(groups(p).filter(o => o.values.length === 1).map(o => [o.name,o.values[0]]));
  const matches = (v, name, value) => v.options.some(o => o.name === name && o.value === value);
  function variant() {
    const p = products[productIndex];
    if (groups(p).some(o => !choices[o.name])) return null;
    return p.variants.find(v => groups(p).every(o => matches(v, o.name, choices[o.name]))) || null;
  }
  function refreshOptions() {
    const p = products[productIndex];
    $$('[data-option]').forEach(button => {
      const available = p.variants.some(v => v.available && matches(v, button.dataset.option, button.dataset.value) && groups(p).filter(o => o.name !== button.dataset.option && choices[o.name]).every(o => matches(v, o.name, choices[o.name])));
      // aria-disabled keeps unavailable values discoverable to keyboard users.
      button.setAttribute('aria-disabled', String(!available));
      button.setAttribute('aria-pressed', String(choices[button.dataset.option] === button.dataset.value));
      button.setAttribute('aria-label', `${button.dataset.value}${available ? '' : ' — unavailable with current selection'}`);
    });
    const v = variant();
    $('#variant-price').textContent = money(v?.price ?? p.price);
    $('#add-preview').disabled = !v?.available;
    $('#add-preview').textContent = v?.available ? `Add to preview bag · ${money(v.price)}` : 'Choose available options';
    $('#selection-status').textContent = v?.available ? `${v.title === 'Default Title' ? 'Standard option' : v.title} · Available in the saved catalog.` : 'Choose an available option in each group. Crossed-out options are unavailable in this catalog snapshot.';
  }
  function openProduct(index, trigger) {
    productIndex = index;
    const p = products[index];
    choices = initialChoices(p);
    const dialog = $('#product-dialog');
    dialog.innerHTML = `${dialogTop('A–OK / Garment details')}<div class="dialog-product"><div class="detail-photo"><img id="detail-image" src="${safe(p.images[0])}" alt="${safe(p.title)} — catalog photograph 1" width="800" height="1000"><div class="photo-controls" role="group" aria-label="Product photographs">${p.images.map((_,i)=>`<button data-photo="${i}" aria-pressed="${i===0}">Photo ${i+1}</button>`).join('')}</div><p class="dialog-note">Catalog photographs are not mapped to selected colors.</p><button class="text-button" data-inspect="${index}">Inspect print / garment ↗</button></div><div class="detail-copy"><p class="micro">${safe(p.category)} / Catalog category</p><h2 id="product-title">${safe(p.title)}</h2><span id="variant-price" class="price">${money(p.price)}</span><p>${safe(p.description.slice(0,190))}${p.description.length>190?'…':''}</p>${groups(p).map(o=>`<fieldset class="option-group"><legend>${safe(o.name)}</legend><div>${[...o.values].sort((a,b)=>o.name==='Size'?['XXS','XS','S','M','L','XL','2XL','3XL'].indexOf(a)-['XXS','XS','S','M','L','XL','2XL','3XL'].indexOf(b):0).map(v=>`<button data-option="${safe(o.name)}" data-value="${safe(v)}" aria-pressed="false">${safe(v)}</button>`).join('')}</div></fieldset>`).join('')}${!p.options.some(o=>o.name==='Size')?'<p class="dialog-note">No size choices are supplied in this catalog record. Confirm sizing in the actual store.</p>':''}<button class="text-button" id="reset-options">Clear selections</button><p id="selection-status" class="dialog-note" role="status"></p><button class="action" id="add-preview" disabled>Choose available options</button><p id="add-status" role="status"></p><button class="action" data-bag>View preview bag <span data-count>0</span></button><p class="dialog-note">Preview only. No checkout, payment or order. Availability is a saved snapshot, not live inventory.</p><details><summary>Full catalog description</summary><p>${safe(p.description)}</p></details><a class="store-link" href="/products/${safe(p.handle)}" target="_blank" rel="noopener">View this piece in the actual store ↗</a></div></div>`;
    refreshOptions();
    updateCount();
    show(dialog, trigger);
  }
  function updateCount() {
    $$('[data-count]').forEach(el => {el.textContent = bag.reduce((n,i) => n+i.quantity, 0);});
  }
  function refreshBagTotals(message) {
    updateCount();
    $('#bag-subtotal').textContent = money(bag.reduce((n,i) => n+i.price*i.quantity, 0));
    $('#bag-empty').hidden = bag.length > 0;
    if (message) $('#bag-status').textContent = message;
  }
  function renderBag() {
    $('#bag-dialog').innerHTML = `${dialogTop('A–OK / Preview only')}<h2 id="bag-title">Your preview bag</h2><p class="dialog-note">These items are separate from real checkout. This bag stays on this page and resets when reloaded.</p><div id="bag-lines">${bag.map(item=>{
      const p = products[item.index];
      return `<article class="bag-item" data-line="${safe(item.id)}"><img src="${safe(p.images[0])}" alt="${safe(p.name)} — catalog photograph, not color specific" width="85" height="100"><div><h3>${safe(p.name)}</h3><p>${safe(item.title==='Default Title'?'Standard option':item.title)} · ${money(item.price)} each</p><div class="bag-actions"><button data-quantity="${safe(item.id)}" data-delta="-1" aria-label="Decrease quantity of ${safe(p.name)}" aria-disabled="${item.quantity===1}">−</button><span class="bag-quantity" aria-label="Quantity">${item.quantity}</span><button data-quantity="${safe(item.id)}" data-delta="1" aria-label="Increase quantity of ${safe(p.name)}" aria-disabled="${item.quantity===99}">+</button><button data-remove="${safe(item.id)}" aria-label="Remove ${safe(p.name)}">Remove</button></div><p class="line-total">Line total: ${money(item.price*item.quantity)}</p></div></article>`;
    }).join('')}</div><p id="bag-empty" class="bag-empty">Nothing in here yet.<br>The interesting mistakes are in the shop.</p><div class="bag-total"><span>Subtotal</span><strong id="bag-subtotal"></strong></div><p class="dialog-note">USD · Shipping and tax excluded. Maximum 99 per preview line. No checkout is connected.</p><p id="bag-status" role="status"></p><button class="action" id="keep-shopping" data-close>Return to shopping <span>↗</span></button>`;
    refreshBagTotals();
  }
  function inspect(index, trigger) {
    inspectProduct = index;
    const p = products[index];
    // Prefer an actual alternate photograph; never manufacture a print-only asset.
    const photo = p.images.length > 1 ? 1 : 0;
    $('#inspect-dialog').innerHTML = `${dialogTop('Inspect print / Catalog photography')}<h2 id="inspect-title">${safe(p.name)}</h2><p class="dialog-note">Available alternate photographs of the garment. Not a separate print file. Photographs are not mapped to selected colors.</p><img id="inspect-image" class="inspect-image" src="${safe(p.images[photo])}" alt="${safe(p.title)} — catalog photograph ${photo+1}" width="900" height="1000"><div class="inspect-tools"><p id="inspect-caption" role="status">${photo?'Alternate':'Catalog'} photograph ${photo+1} of ${p.images.length}</p><div class="photo-controls" role="group" aria-label="Inspect photographs">${p.images.map((_,i)=>`<button data-inspect-photo="${i}" aria-pressed="${i===photo}">Photo ${i+1}</button>`).join('')}</div></div><button class="text-button" data-close>Return to shopping</button>`;
    show($('#inspect-dialog'), trigger);
  }
  function openArt(index, trigger) {
    const a = art[index];
    $('#inspect-dialog').innerHTML = `${dialogTop('A–OK / Art archive')}<h2 id="inspect-title">${a.name}</h2><p class="dialog-note">Existing artwork from the A–OK archive.</p><img class="inspect-image" src="${artPath(a)}" alt="${a.name}" width="900" height="900"><button class="text-button" data-close>Return to shopping</button>`;
    show($('#inspect-dialog'), trigger);
  }
  function openGenerator(trigger) {
    sampleIndex = 0;
    $('#generator-dialog').innerHTML = `${dialogTop('Existing-sample generator preview')}<div class="generator-layout"><div><h2 id="generator-title">Existing-sample generator preview</h2><p class="dialog-note">This shows three existing A–OK artworks. It does not generate new images or send anything to a model.</p><label for="sample-choice">Choose an existing sample</label><select id="sample-choice">${art.map((a,i)=>`<option value="${i}">${a.name}</option>`).join('')}</select><button class="action" id="show-sample">Show existing sample <span>↗</span></button><button class="text-button" id="inspect-sample">Inspect this artwork ↗</button><button class="action" data-close>Return to shopping <span>↗</span></button></div><figure><img id="sample-image" src="${artPath(art[0])}" alt="${art[0].name}" width="600" height="600"><figcaption id="sample-status" role="status">Existing sample 1 / ${art[0].name}. No new image generated.</figcaption></figure></div>`;
    show($('#generator-dialog'), trigger);
  }
  function filterCatalog(button) {
    const cards = $$('.product-card');
    const previous = new Map(reduced.matches ? [] : cards.filter(c=>!c.hidden).map(c=>[c,c.getBoundingClientRect()]));
    cards.forEach(card => {card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;});
    $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b===button)));
    const visible = cards.filter(c=>!c.hidden);
    if (!reduced.matches) visible.forEach(card => {
      const before = previous.get(card), after = card.getBoundingClientRect();
      const dx = before ? before.left-after.left : 0, dy = before ? before.top-after.top : 5;
      if (dx || dy) motion(card, [{transform:`translate(${dx}px, ${dy}px)`,opacity:.6},{transform:'translate(0,0)',opacity:1}]);
    });
    $('#results').textContent = `${visible.length} ${visible.length===1?'piece':'pieces'} · ${button.textContent} · USD`;
    // The category buttons are never replaced or moved; keyboard focus stays put.
  }
  async function campaignPhoto(photo, index = campaignIndex) {
    const request = ++campaignRequest;
    const p = products[index];
    const other = (photo+1) % p.images.length;
    $('.diptych').setAttribute('aria-busy','true');
    $('#campaign-status').textContent = `Loading ${p.name} photographs…`;
    try {
      await Promise.all([photo,other].map(i => {
        const image = new Image();
        image.src = p.images[i];
        return image.decode();
      }));
    } catch {
      if (request !== campaignRequest) return;
      $('.diptych').setAttribute('aria-busy','false');
      $('#campaign-status').textContent = 'That photograph could not load. The previous piece is still selected. Try another photograph.';
      return;
    }
    if (request !== campaignRequest) return;
    // Commit the new product only once both photos can be painted; latest request wins.
    if (campaignIndex !== index) {
      $('#campaign-photos').innerHTML = p.images.map((_,i)=>`<button data-campaign-photo="${i}" aria-pressed="${i===photo}">Photo ${i+1}</button>`).join('');
    }
    campaignIndex = index;
    $$('[data-feature]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.feature)===index)));
    $('#campaign-name').textContent = p.name;
    $('#campaign-price').textContent = money(p.price);
    $('#campaign-buy').dataset.product = index;
    $('#campaign-image').src = p.images[photo];
    $('#campaign-image').alt = `${p.name} — catalog photograph ${photo+1}`;
    $('#campaign-alternate').src = p.images[other];
    $('#campaign-alternate').alt = `${p.name} — catalog photograph ${other+1}`;
    $('#campaign-caption').textContent = `${String(photo+1).padStart(2,'0')} / ${p.name}`;
    $$('[data-campaign-photo]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.campaignPhoto)===photo)));
    $('#campaign-status').textContent = `${p.name}, ${money(p.price)}, photograph ${photo+1}. Purchase options target ${p.name}.`;
    $('.diptych').setAttribute('aria-busy','false');
  }
  function selectCampaign(button) {
    campaignPhoto(0, Number(button.dataset.feature));
  }
  function closeMenu(restore = false) {
    $('#mobile-menu').hidden = true;
    $('#menu-toggle').setAttribute('aria-expanded','false');
    $('#menu-toggle').textContent = 'Menu +';
    if (restore) $('#menu-toggle').focus();
  }
  $('#menu-toggle').addEventListener('click', () => {
    const menu = $('#mobile-menu');
    menu.hidden = !menu.hidden;
    $('#menu-toggle').setAttribute('aria-expanded',String(!menu.hidden));
    $('#menu-toggle').textContent = menu.hidden ? 'Menu +' : 'Close −';
  });
  $$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>{
    closeMenu();
    $(a.getAttribute('href')).focus();
  }));
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && !$('#mobile-menu').hidden && !$('dialog[open]')){closeMenu(true);e.preventDefault();}});
  document.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-close')) {closeDialog(b.closest('dialog'));return;}
    if (b.hasAttribute('data-product')) {openProduct(Number(b.dataset.product),b);return;}
    if (b.hasAttribute('data-option')) {
      if (b.getAttribute('aria-disabled') === 'true') {
        $('#selection-status').textContent = `${b.dataset.value} is unavailable with the current selection. Clear selections to try another combination.`;
        return;
      }
      choices[b.dataset.option] = b.dataset.value;
      $('#add-status').textContent = '';
      refreshOptions();return;
    }
    if (b.id === 'reset-options') {
      choices = initialChoices(products[productIndex]);
      refreshOptions();$('#add-status').textContent='Selections cleared.';return;
    }
    if (b.hasAttribute('data-photo')) {
      const photo = Number(b.dataset.photo), p = products[productIndex];
      $('#detail-image').src = p.images[photo];
      $('#detail-image').alt = `${p.title} — catalog photograph ${photo+1}`;
      $$('[data-photo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return;
    }
    if (b.id === 'add-preview') {
      const v = variant();if(!v?.available)return;
      const existing = bag.find(i=>i.id===v.id);
      if(existing?.quantity===99){$('#add-status').textContent='Preview limit reached: 99 of this variant.';return;}
      if(existing)existing.quantity++;else bag.push({id:v.id,index:productIndex,title:v.title,price:v.price,quantity:1});
      updateCount();$('#add-status').textContent=`${products[productIndex].name} added to preview bag. ${existing?.quantity || 1} of this variant in bag.`;return;
    }
    if (b.hasAttribute('data-bag')) {renderBag();show($('#bag-dialog'),b);return;}
    if (b.hasAttribute('data-quantity')) {
      const item = bag.find(i=>i.id===b.dataset.quantity), next = item.quantity+Number(b.dataset.delta);
      if(next<1 || next>99){$('#bag-status').textContent=next<1?'Minimum quantity is 1. Use Remove to remove this piece.':'Preview limit is 99 per variant.';return;}
      item.quantity = next;
      const line = b.closest('.bag-item');
      $('.bag-quantity',line).textContent = next;
      $('.line-total',line).textContent = `Line total: ${money(item.price*next)}`;
      $('[data-delta="-1"]',line).setAttribute('aria-disabled',String(next===1));
      $('[data-delta="1"]',line).setAttribute('aria-disabled',String(next===99));
      refreshBagTotals(`${products[item.index].name}: quantity ${next}. Subtotal ${money(bag.reduce((n,i)=>n+i.price*i.quantity,0))}.`);
      return; // No DOM replacement: the pressed quantity button retains focus.
    }
    if (b.hasAttribute('data-remove')) {
      const index = bag.findIndex(i=>i.id===b.dataset.remove), name = products[bag[index].index].name;
      const line = b.closest('.bag-item');
      const nextFocus = line.nextElementSibling?.querySelector('[data-remove]') || line.previousElementSibling?.querySelector('[data-remove]') || $('#keep-shopping');
      bag.splice(index,1);line.remove();refreshBagTotals(`${name} removed. ${bag.length ? '' : 'Your preview bag is empty.'}`);nextFocus.focus();return;
    }
    if (b.hasAttribute('data-filter')) {filterCatalog(b);return;}
    if (b.hasAttribute('data-inspect')) {inspect(Number(b.dataset.inspect),b);return;}
    if (b.hasAttribute('data-inspect-photo')) {
      const photo = Number(b.dataset.inspectPhoto), p = products[inspectProduct];
      $('#inspect-image').src = p.images[photo];$('#inspect-image').alt = `${p.title} — catalog photograph ${photo+1}`;
      $('#inspect-caption').textContent = `Catalog photograph ${photo+1} of ${p.images.length}`;
      $$('[data-inspect-photo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return;
    }
    if (b.hasAttribute('data-art')) {openArt(Number(b.dataset.art),b);return;}
    if (b.hasAttribute('data-generator')) {openGenerator(b);return;}
    if (b.id === 'show-sample') {
      sampleIndex = Number($('#sample-choice').value);const a = art[sampleIndex];
      $('#sample-image').src = artPath(a);$('#sample-image').alt = a.name;
      $('#sample-status').textContent = `Existing sample ${sampleIndex+1} / ${a.name}. No new image generated.`;return;
    }
    if (b.id === 'inspect-sample') {openArt(sampleIndex,b);return;}
    if (b.hasAttribute('data-feature')) {selectCampaign(b);return;}
    if (b.hasAttribute('data-campaign-photo')) {campaignPhoto(Number(b.dataset.campaignPhoto));}
  });
})();
