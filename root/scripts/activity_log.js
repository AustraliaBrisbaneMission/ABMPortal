$(document).ready(function(){
   var logTable = $('#logTable');

   $.post('/activity_log/db', function(results){
      var dataSet = results;
      logTable.dataTable({
          "data": dataSet,
          "order": [[ 3, 'desc' ]],
          "columns": [
               { "title": "Action" },
               { "title": "Name" },
               { "title": "Username" },
               { "title": "Time" }
           ]
      } );
   });
   
});