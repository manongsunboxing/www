/* PC Component Table v2 — one faceted view per category.
 *
 * Runs beside index.html rather than replacing it: this page reads the
 * per-category files (gpu.json, ram.json, …) that export_to_json.py writes
 * alongside the untouched data.json, so v1 keeps working whatever happens here.
 *
 * Unlike laptops.js, `model` is kept and shown. It is the identity the
 * component side needs for per-model price history in trends.json, and the
 * facets below are additive fields derived from it in component_specs.py.
 */
(function () {
  // Facets per category. This mirrors component_specs.FIELDS_BY_CATEGORY on the
  // Python side; tests/test_table_v2.py asserts the two agree, so adding a
  // facet there cannot silently leave the page without a control for it.
  const FACETS_BY_CATEGORY = {
    GPU:     ['brand', 'vendor', 'vram'],
    RAM:     ['brand', 'generation', 'capacity', 'speed', 'form'],
    CPU:     ['brand', 'series'],
    MOBO:    ['brand', 'chipset', 'form'],
    MONITOR: ['brand', 'size', 'resolution', 'refresh', 'panel'],
  };

  // Facets every category gets, drawn from the row rather than the spec module.
  const COMMON_FACETS = ['shop', 'availability'];

  const LABELS = {
    brand: 'Brand', vendor: 'Chip', vram: 'VRAM', generation: 'Type',
    capacity: 'Capacity', speed: 'Speed', form: 'Form', series: 'Series',
    chipset: 'Chipset', size: 'Size', resolution: 'Resolution',
    refresh: 'Refresh', panel: 'Panel', shop: 'Shop', availability: 'Stock',
  };

  // Facets whose values are numbers with a unit; sorted by magnitude so the
  // dropdown reads 8GB, 16GB, 32GB rather than 16GB, 32GB, 8GB.
  const NUMERIC = new Set(['vram', 'capacity', 'speed', 'size', 'refresh']);

  const PAGE = 200;
  const UNKNOWN = 'Unknown';

  let category = 'GPU';
  let DATA = [];
  const CACHE = {};
  let sortKey = 'price', sortDir = 1, shown = PAGE;

  const peso = n => '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });
  const el = id => document.getElementById(id);
  const esc = s => String(s === null || s === undefined ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const facetFields = () =>
    (FACETS_BY_CATEGORY[category] || []).concat(COMMON_FACETS);

  function sortVals(f) {
    let vals = [...new Set(DATA.map(r => r[f]).filter(v => v !== undefined && v !== null && v !== ''))];
    const unk = vals.includes(UNKNOWN);
    vals = vals.filter(v => v !== UNKNOWN);
    if (NUMERIC.has(f)) vals.sort((a, b) => parseFloat(a) - parseFloat(b));
    else vals.sort();
    return unk ? vals.concat([UNKNOWN]) : vals;   // Unknown last, still selectable
  }

  const countOf = (f, v) => DATA.reduce((n, r) => n + (r[f] === v ? 1 : 0), 0);

  function buildControls() {
    const fields = facetFields();
    el('controls').innerHTML =
      `<div class="ctl"><label for="q">Search</label>` +
      `<input type="text" id="q" placeholder="e.g. sapphire pulse, 5070, b650"/></div>` +
      fields.map(f =>
        `<div class="ctl"><label for="f_${f}">${esc(LABELS[f] || f)}</label>` +
        `<select id="f_${f}"></select></div>`).join('') +
      `<div class="ctl"><label for="pmin">Min &#8369;</label><input type="number" id="pmin" placeholder="0"/></div>` +
      `<div class="ctl"><label for="pmax">Max &#8369;</label><input type="number" id="pmax" placeholder="any"/></div>` +
      `<div class="ctl"><label>&nbsp;</label><button class="reset" id="reset">Reset</button></div>`;

    fields.forEach(f => {
      const sel = el('f_' + f);
      if (!sel) return;
      sel.innerHTML = '<option value="">All</option>' +
        sortVals(f).map(v => `<option value="${esc(v)}">${esc(v)} (${countOf(f, v)})</option>`).join('');
    });
    wire();
  }

  function current() {
    const o = {
      q: el('q').value.toLowerCase().trim(),
      pmin: parseFloat(el('pmin').value) || 0,
      pmax: parseFloat(el('pmax').value) || Infinity,
    };
    facetFields().forEach(f => { const s = el('f_' + f); o[f] = s ? s.value : ''; });
    return o;
  }

  function match(r, o) {
    if (o.q) {
      const hay = ((r.model || '') + ' ' + (r.description || '') + ' ' + (r.shop || '')).toLowerCase();
      if (!o.q.split(/\s+/).every(t => hay.includes(t))) return false;
    }
    for (const f of facetFields()) if (o[f] && r[f] !== o[f]) return false;
    const p = Number(r.price);
    return p >= o.pmin && p <= o.pmax;
  }

  function render(resetPage) {
    if (resetPage) shown = PAGE;
    const o = current();
    // Rows with no price cannot be compared or sorted; data.json stores null
    // for them and the v1 table shows them blank. Here they are excluded so a
    // price range never silently hides a priced row alongside them.
    const rows = DATA.filter(r => r.price !== null && r.price !== undefined && match(r, o))
      .sort((a, b) => {
        if (sortKey === 'price') return (Number(a.price) - Number(b.price)) * sortDir;
        return String(a[sortKey] || '').localeCompare(String(b[sortKey] || '')) * sortDir;
      });

    const prices = rows.map(r => Number(r.price));
    el('count').innerHTML = rows.length
      ? `<b>${rows.length}</b> of ${DATA.length} ${esc(category)} listings &middot; ` +
        `cheapest ${peso(Math.min(...prices))} &middot; dearest ${peso(Math.max(...prices))}`
      : `<b>0</b> of ${DATA.length} ${esc(category)} listings match`;

    const chipFields = FACETS_BY_CATEGORY[category] || [];
    el('tbody').innerHTML = rows.slice(0, shown).map(r => {
      const chips = chipFields.map(f => {
        const v = r[f];
        if (v === undefined || v === null || v === '') return '';
        const unk = v === UNKNOWN;
        return `<span class="chip${unk ? ' unk' : ''}">${unk ? esc(LABELS[f] || f) + ': unknown' : esc(v)}</span>`;
      }).join('');
      const link = r.link
        ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.description)}</a>`
        : esc(r.description);
      const inStock = String(r.availability || '').toLowerCase().includes('in stock');
      return `<tr><td class="modelcell">${esc(r.model)}</td>` +
        `<td class="name">${link}<div class="chips">${chips}</div></td>` +
        `<td class="shop">${esc(r.shop)}</td><td class="price">${peso(r.price)}</td>` +
        `<td class="${inStock ? '' : 'oos'}">${esc(r.availability)}</td></tr>`;
    }).join('');

    el('more').innerHTML = rows.length > shown
      ? `<button id="moreBtn">Show more (${rows.length - shown} left)</button>` : '';
    const btn = el('moreBtn');
    if (btn) btn.onclick = () => { shown += PAGE; render(false); };
  }

  function wire() {
    ['q', 'pmin', 'pmax'].forEach(id => {
      const node = el(id);
      if (node) node.addEventListener('input', () => render(true));
    });
    facetFields().forEach(f => {
      const s = el('f_' + f);
      if (s) s.addEventListener('change', () => render(true));
    });
    const reset = el('reset');
    if (reset) reset.onclick = () => {
      el('q').value = ''; el('pmin').value = ''; el('pmax').value = '';
      facetFields().forEach(f => { const s = el('f_' + f); if (s) s.value = ''; });
      render(true);
    };
  }

  function load(cat) {
    category = cat;
    sortKey = 'price'; sortDir = 1;
    if (CACHE[cat]) {
      DATA = CACHE[cat];
      buildControls();
      render(true);
      return Promise.resolve();
    }
    el('count').textContent = 'Loading ' + cat + '…';
    return fetch(cat.toLowerCase() + '.json')
      .then(r => {
        if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
        return r.json();
      })
      .then(d => {
        CACHE[cat] = d;
        DATA = d;
        buildControls();
        render(true);
      })
      .catch(e => {
        DATA = [];
        el('tbody').innerHTML = '';
        el('count').textContent = 'Could not load ' + cat.toLowerCase() + '.json: ' + e.message;
      });
  }

  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.onclick = () => {
      const k = th.dataset.sort;
      sortDir = (k === sortKey) ? -sortDir : 1;
      sortKey = k;
      render(true);
    };
  });

  document.querySelectorAll('.cat-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      load(b.dataset.cat);
    });
  });

  load('GPU');
})();
