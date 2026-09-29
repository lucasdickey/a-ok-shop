(() => {
  const menu = document.getElementById('mobile-nav');
  const toggle = document.getElementById('menu-button');
  function closeMenu() { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu +'; }
  toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); menu.hidden = !open; toggle.textContent = open ? 'Close −' : 'Menu +'; });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); toggle.focus(); } });
  window.matchMedia('(min-width:721px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    let count = 0;
    document.querySelectorAll('.item').forEach(item => { item.hidden = button.dataset.filter !== 'All pieces' && item.dataset.category !== button.dataset.filter; if (!item.hidden) count++; });
    document.getElementById('result-count').textContent = `${count} LINE ${count === 1 ? 'ITEM' : 'ITEMS'}`;
  }));
})();
