fetch('trends.json')
  .then(res => res.json())
  .then(raw => {
    // trends.json interns store details in a top-level table; expandTrends in
    // trends_format.js resolves the indices and accepts the old layout too.
    const data = expandTrends(raw).models;

    const rows = [];
    for (const [model, node] of Object.entries(data)) {
      const sorted = (node.entries || []).slice()
        .sort((a,b) => new Date(a.date) - new Date(b.date));
      if (!sorted.length) continue;
      const lastDate = sorted[sorted.length - 1].date;
      const latest = sorted.filter(e => e.date === lastDate);
      const cheapest = latest.reduce((a,b) => a.price <= b.price ? a : b);
      const stores = cheapest.stores
        .map(s => {
          const desc = s.name ? ` - ${s.name}` : '';
          return `<a href="${s.link}" target="_blank">${s.store}${desc}</a>`;
        })
        .join(', ');
      const category = inferTrendCategory(model, node);
      if (!category) continue;
      rows.push({category, model, price: cheapest.price, stores});
    }

    const table = $('#summaryTable').DataTable({
      data: rows,
      columns: [
        {data:'category', visible: false},
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

    // Category segmented control
    $('.cat-btn').on('click', function() {
      $('.cat-btn').removeClass('active');
      $(this).addClass('active');
      const cat = $(this).data('cat');
      if (cat) {
        table.column(0).search('^' + $.fn.dataTable.util.escapeRegex(cat) + '$', true, false).draw();
      } else {
        table.column(0).search('').draw();
      }
    });
  });
