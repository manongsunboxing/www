fetch('data.json')
  .then(response => response.json())
  .then(data => {
    const headers = ['category','model','description','shop','price','availability','last_update','link'];
    const table = $('#gpuTable').DataTable({
      data: data,
      ordering: true,
      columns: [
        { data: 'category' },
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
    const uniques = {category: new Set(), shop: new Set(), availability: new Set(), model: new Set()};
    data.forEach(row => {
      uniques.category.add(row.category);
      uniques.shop.add(row.shop);
      uniques.availability.add(row.availability);
      uniques.model.add(row.model);
    });

    const selectCols = ['model', 'availability', 'shop'];
    const optionsHtml = {};
    Object.entries(uniques).forEach(([key, vals]) => {
      const opts = Array.from(vals).sort().map(v => `<option value="${v}">${v}</option>`).join('');
      optionsHtml[key] = `<option value=""></option>` + opts;
    });

    $('#gpuTable thead th').each(function(i){
      const header = headers[i];
      let input;
      if(selectCols.includes(header)) {
        input = $(`<select>${optionsHtml[header]}</select>`);
        $(this).append('<br>').append(input);
        input.select2({ width: 'resolve', placeholder: 'Filter' });
        input.on('change', function(e){
          e.stopPropagation();
          const val = $(this).val();
          const regex = val ? '^' + $.fn.dataTable.util.escapeRegex(val) + '$' : '';
          table.column(i).search(regex, true, false).draw();
        });
      } else if(['category'].includes(header)) {
        input = $(`<input type="text" list="${header}List" placeholder="Search" />`);
        const dl = $('<datalist>').attr('id', header + 'List');
        uniques[header].forEach(v => dl.append($('<option>').val(v)));
        $('body').append(dl);
        $(this).append('<br>').append(input);
        $('input', this)
          .on('click', function(e){ e.stopPropagation(); })
          .on('keyup change', function(e){
            e.stopPropagation();
            if(table.column(i).search() !== this.value){
              table.column(i).search(this.value).draw();
            }
          });
      } else {
        input = $('<input type="text" placeholder="Search" />');
        $(this).append('<br>').append(input);
        $('input', this)
          .on('click', function(e){ e.stopPropagation(); })
          .on('keyup change', function(e){
            e.stopPropagation();
            if(table.column(i).search() !== this.value){
              table.column(i).search(this.value).draw();
            }
          });
      }
    });
    $('#globalSearch').on('keyup', function(){
      table.search(this.value).draw();
    });
  });
