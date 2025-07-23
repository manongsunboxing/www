fetch('trends.json')
  .then(res => res.json())
  .then(raw => {
    const data = raw.trends || raw;
    const select = document.getElementById('gpuSelect');
    const models = Object.keys(data).sort();
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    });
    $(select).select2({ width: '200px' });
    const ctx = document.getElementById('trendChart').getContext('2d');
    let chart;

    function render(model) {
      const entries = (data[model] || []).sort((a,b) => new Date(a.date) - new Date(b.date));
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
    if (models.length) {
      select.value = models[0];
      render(models[0]);
    }
  });
