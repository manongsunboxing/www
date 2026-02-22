fetch('trends.json')
  .then(res => res.json())
  .then(raw => {
    const data = raw.trends || raw;

    function inferCategory(model, entries) {
      if (entries && entries.length && entries[0].category) {
        return entries[0].category;
      }
      if (/^DDR/i.test(model)) return 'RAM';
      if (/^(I[3579]-|R[3579]-|Ultra[579]-|ATHLON-|PENTIUM-)/i.test(model)) return 'CPU';
      if (/^(RTX[A-Z]?\d|GTX\d|GT\d|RX\d|ARC[A-Z]?\d|T\d)/i.test(model)) return 'GPU';
      return null;
    }

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
      const category = inferCategory(model, entries);
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
