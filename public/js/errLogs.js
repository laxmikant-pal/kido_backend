$(document).ready(function (){
  // $.fn.dataTable.moment('MMMM Do YYYY, h:mm:ss.SSS a');
  var table = $('#example').DataTable({
    'responsive': true,
    'order': [[0, 'desc']]
  });
  // Handle click on "Expand All" button
  $('#btn-show-all-children').on('click', function(){
  // Expand row details
  table.rows(':not(.parent)').nodes().to$().find('td:first-child').trigger('click');
  });
  // Handle click on "Collapse All" button
  $('#btn-hide-all-children').on('click', function(){
  // Collapse row details
  table.rows('.parent').nodes().to$().find('td:first-child').trigger('click');
  });
});