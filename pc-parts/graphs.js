fetch('trends.json')
  .then(res => res.json())
  .then(raw => {
    // trends.json interns store details in a top-level table; expandTrends in
    // trends_format.js resolves the indices and accepts the old layout too.
    const data = expandTrends(raw).models;
    const select = document.getElementById('gpuSelect');
    const allModels = Object.keys(data).filter(m => inferCategory(m) !== null).sort();
    let currentCat = '';

    function inferCategory(model) {
      return inferTrendCategory(model, data[model]);
    }

    function populateSelect(cat) {
      const filtered = cat ? allModels.filter(m => inferCategory(m) === cat) : allModels;
      $(select).empty();
      filtered.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        select.appendChild(opt);
      });
      $(select).trigger('change.select2');
      if (filtered.length) {
        select.value = filtered[0];
        render(filtered[0]);
      }
    }

    $(select).select2({ width: '200px' });
    const ctx = document.getElementById('trendChart').getContext('2d');
    let chart;

    function render(model) {
      const node = data[model];
      const entries = ((node && node.entries) || []).slice()
        .sort((a,b) => new Date(a.date) - new Date(b.date));
      const dataset = entries.map(e => ({x: e.date, y: e.price, stores: e.stores.map(s => s.store).join(', ')}));
      const cfg = {
        type: 'line',
        data: { datasets: [{ label: model, data: dataset, borderColor: 'rgb(75,192,192)', fill: false, tension: 0 }] },
        options: {
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.raw.y} ("${ctx.raw.stores}")`
              }
            }
          },
          scales: {
            x: { type: 'time', time: { unit: 'day' }, title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'Price' } }
          }
        }
      };
      if (chart) chart.destroy();
      chart = new Chart(ctx, cfg);
    }

    $(select).on('change', () => render(select.value));

    // Category toggle
    $('.cat-btn').on('click', function() {
      $('.cat-btn').removeClass('active');
      $(this).addClass('active');
      currentCat = $(this).data('cat');
      populateSelect(currentCat);
    });

    populateSelect('');
  });
