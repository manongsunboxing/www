/* Laptop page: search over the full title plus spec facets.
   No normalized model key — specs are filters, never identity. */
(function () {
  const FACETS = ['brand', 'cpu', 'gpu', 'ram', 'storage', 'screen', 'store', 'stock'];
  const CHIPS = ['brand', 'cpu', 'gpu', 'ram', 'storage', 'screen', 'refresh'];
  const PAGE = 200;            // rows per "show more" click
  const UNKNOWN = 'Unknown';

  let DATA = [];
  let sortKey = 'price', sortDir = 1, shown = PAGE;

  const peso = n => '₱' + n.toLocaleString('en-PH', { maximumFractionDigits: 0 });
  const el = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function sortVals(f) {
    let vals = [...new Set(DATA.map(r => r[f]).filter(Boolean))];
    const unk = vals.includes(UNKNOWN);
    vals = vals.filter(v => v !== UNKNOWN);
    if (f === 'ram' || f === 'storage') vals.sort((a, b) => parseInt(a) - parseInt(b));
    else if (f === 'screen') vals.sort((a, b) => parseFloat(a) - parseFloat(b));
    else vals.sort();
    return unk ? vals.concat([UNKNOWN]) : vals;   // Unknown last, still selectable
  }

  const countOf = (f, v) => DATA.reduce((n, r) => n + (r[f] === v ? 1 : 0), 0);

  function buildFacets() {
    FACETS.forEach(f => {
      const sel = el('f_' + f);
      if (!sel) return;
      sel.innerHTML = '<option value="">All</option>' +
        sortVals(f).map(v => `<option value="${esc(v)}">${esc(v)} (${countOf(f, v)})</option>`).join('');
    });
  }

  function current() {
    const o = {
      q: el('q').value.toLowerCase().trim(),
      pmin: parseFloat(el('pmin').value) || 0,
      pmax: parseFloat(el('pmax').value) || Infinity,
    };
    FACETS.forEach(f => { const s = el('f_' + f); o[f] = s ? s.value : ''; });
    return o;
  }

  function match(r, o) {
    if (o.q) {
      const hay = (r.title + ' ' + r.store).toLowerCase();
      if (!o.q.split(/\s+/).every(t => hay.includes(t))) return false;
    }
    for (const f of FACETS) if (o[f] && r[f] !== o[f]) return false;
    return r.price >= o.pmin && r.price <= o.pmax;
  }

  function render(resetPage) {
    if (resetPage) shown = PAGE;
    const o = current();
    const rows = DATA.filter(r => match(r, o)).sort((a, b) => {
      if (sortKey === 'price') return (a.price - b.price) * sortDir;
      return String(a[sortKey] || '').localeCompare(String(b[sortKey] || '')) * sortDir;
    });

    el('count').innerHTML = rows.length
      ? `<b>${rows.length}</b> of ${DATA.length} laptops &middot; cheapest ${peso(Math.min(...rows.map(r => r.price)))} &middot; dearest ${peso(Math.max(...rows.map(r => r.price)))}`
      : `<b>0</b> of ${DATA.length} laptops match`;

    el('tbody').innerHTML = rows.slice(0, shown).map(r => {
      const chips = CHIPS.filter(f => r[f]).map(f => {
        const unk = r[f] === UNKNOWN;
        return `<span class="chip ${f === 'gpu' ? 'gpu ' : ''}${unk ? 'unk' : ''}">${unk ? f + ': unknown' : esc(r[f])}</span>`;
      }).join('');
      const link = r.url
        ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>`
        : esc(r.title);
      return `<tr><td class="name">${link}<div class="chips">${chips}</div></td>` +
        `<td class="shop">${esc(r.store)}</td><td class="price">${peso(r.price)}</td>` +
        `<td class="${r.stock === 'In Stock' ? '' : 'oos'}">${esc(r.stock)}</td></tr>`;
    }).join('');

    el('more').innerHTML = rows.length > shown
      ? `<button id="moreBtn">Show more (${rows.length - shown} left)</button>` : '';
    const btn = el('moreBtn');
    if (btn) btn.onclick = () => { shown += PAGE; render(false); };
  }

  function wire() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.onclick = () => {
        const k = th.dataset.sort;
        sortDir = (k === sortKey) ? -sortDir : 1;
        sortKey = k;
        render(true);
      };
    });
    ['q', 'pmin', 'pmax'].forEach(id => el(id).addEventListener('input', () => render(true)));
    FACETS.forEach(f => { const s = el('f_' + f); if (s) s.addEventListener('change', () => render(true)); });
    el('reset').onclick = () => {
      el('q').value = ''; el('pmin').value = ''; el('pmax').value = '';
      FACETS.forEach(f => { const s = el('f_' + f); if (s) s.value = ''; });
      render(true);
    };
  }

  fetch('laptops.json')
    .then(r => r.json())
    .then(d => { DATA = d; buildFacets(); wire(); render(true); })
    .catch(e => { el('count').textContent = 'Could not load laptops.json: ' + e; });
})();
