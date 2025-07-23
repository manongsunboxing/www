fetch('data.json')
  .then(response => response.json())
  .then(data => {
    const headers = ['category','model','description','shop','price','availability','link'];
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

    Object.entries(uniques).forEach(([key, vals]) => {
      const dl = $('<datalist>').attr('id', key + 'List');
      Array.from(vals).sort().forEach(v => dl.append($('<option>').val(v)));
      $('body').append(dl);
    });

    $('#gpuTable thead th').each(function(i){
      const header = headers[i];
      let input;
      if(['category','shop','availability','model'].includes(header)) {
        input = `<input type="text" list="${header}List" placeholder="Search" />`;
      } else {
        input = '<input type="text" placeholder="Search" />';
      }
      $(this).append('<br>' + input);
      $('input', this)
        .on('click', function(e){
          // Prevent sorting when clicking inside the search box
          e.stopPropagation();
        })
        .on('keyup change', function(e){
          e.stopPropagation();
          if(table.column(i).search() !== this.value){
            table.column(i).search(this.value).draw();
          }
        });
    });
    $('#globalSearch').on('keyup', function(){
      table.search(this.value).draw();
    });
  });
