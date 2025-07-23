fetch('trends.json')
  .then(res => res.json())
  .then(raw => {
    const data = raw.trends || raw;
    const rows = [];
    for (const [model, entries] of Object.entries(data)) {
      const sorted = entries.sort((a,b) => new Date(a.date) - new Date(b.date));
      const lastDate = sorted[sorted.length - 1].date;
      const latest = sorted.filter(e => e.date === lastDate);
      const cheapest = latest.reduce((a,b) => a.price <= b.price ? a : b);
      const stores = cheapest.stores
        .map(s => {
          const desc = s.name ? ` - ${s.name}` : '';
          return `<a href="${s.link}" target="_blank">${s.store}${desc}</a>`;
        })
        .join(', ');
      rows.push({model, price: cheapest.price, stores});
    }
    $('#summaryTable').DataTable({
      data: rows,
      columns: [
        {data:'model'},
        {data:'price'},
        {data:'stores', orderable:false}
      ],
      initComplete: function () {
        $('select[name="summaryTable_length"]').select2({
          minimumResultsForSearch: Infinity
        });
      }
    });
  });
