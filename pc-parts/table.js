fetch('data.json')
  .then(response => response.json())
  .then(data => {
    const headers = ['category','model','description','shop','price','availability','last_update','link'];
    const table = $('#gpuTable').DataTable({
      data: data,
      ordering: true,
      columns: [
        { data: 'category', visible: false },
        { data: 'model' },
        { data: 'description' },
        { data: 'shop' },
        { data: 'price' },
        { data: 'availability' },
        { data: 'last_update' },
        { data: 'link', render: d => `<a href="${d}" target="_blank">link</a>` }
      ],
      dom: 'lrtip',
      initComplete: function () {
        $('select[name="gpuTable_length"]').select2({
          minimumResultsForSearch: Infinity
        });
      }
    });
    const uniques = {shop: new Set(), availability: new Set(), model: new Set()};
    data.forEach(row => {
      uniques.shop.add(row.shop);
      uniques.availability.add(row.availability);
      uniques.model.add(row.model);
    });

    const selectCols = ['model', 'availability', 'shop'];
    const selects = {};  // header -> select element

    function buildOptions(header) {
      const vals = new Set();
      table.column(headers.indexOf(header), {search: 'applied'}).data().each(function(v) { vals.add(v); });
      return `<option value=""></option>` + Array.from(vals).sort().map(v => `<option value="${v}">${v}</option>`).join('');
    }

    function refreshSelects() {
      selectCols.forEach(function(header) {
        const sel = selects[header];
        if (!sel) return;
        const cur = sel.val();
        sel.html(buildOptions(header));
        if (cur && sel.find('option[value="' + CSS.escape(cur) + '"]').length) {
          sel.val(cur);
        } else {
          sel.val('');
        }
        sel.trigger('change.select2');
      });
    }

    const skipCols = ['category', 'last_update', 'link'];
    table.columns().every(function() {
      const colIdx = this.index();
      const header = headers[colIdx];
      if (skipCols.includes(header)) return;
      if (!this.visible()) return;
      const th = $(this.header());
      let input;
      if(selectCols.includes(header)) {
        input = $(`<select>${buildOptions(header)}</select>`);
        selects[header] = input;
        th.append('<br>').append(input);
        input.select2({ width: 'resolve', placeholder: 'Filter', allowClear: true });
        input.next('.select2').on('mousedown click', function(e){ e.stopPropagation(); });
        input.on('change', function(e){
          e.stopPropagation();
          const val = $(this).val();
          const regex = val ? '^' + $.fn.dataTable.util.escapeRegex(val) + '$' : '';
          table.column(colIdx).search(regex, true, false).draw();
        });
      } else {
        input = $('<input type="text" placeholder="Search" />');
        th.append('<br>').append(input);
        $('input', th)
          .on('click', function(e){ e.stopPropagation(); })
          .on('keyup change', function(e){
            e.stopPropagation();
            if(table.column(colIdx).search() !== this.value){
              table.column(colIdx).search(this.value).draw();
            }
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
      refreshSelects();
    });

    $('#globalSearch').on('keyup', function(){
      table.search(this.value).draw();
    });
  });
