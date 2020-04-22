var dataTableLanguange = {
  "sEmptyTable":      "Keine Daten in der Tabelle vorhanden",
  "sInfo":            "_START_ bis _END_ von _TOTAL_",
  "sInfoEmpty":       "0 bis 0 von 0",
  "sInfoFiltered":    "(gefiltert von _MAX_ Einträgen)",
  "sInfoPostFix":     "",
  "sInfoThousands":   ".",
  "sLengthMenu":      "_MENU_ Einträge",
  "sLoadingRecords":  "Wird geladen...",
  "sProcessing":      "Bitte warten...",
  "lengthMenu": '<div class="input-group" id="datatable_pagelength"><span class="input-group-prepend"><span class="input-group-text fa fa-list-ol"></span></span><select class="custom-select form-control form-control-sm custom-select-sm">'+
        '<option value="10">10</option>'+
        '<option value="25">25</option>'+
        '<option value="50">50</option>'+
        '<option value="100">100</option>'+
        '<option value="-1">Alle</option>'+
        '</select></div>',
  "search": '<div class="input-group"><span class="input-group-prepend"><span class="input-group-text fa fa-search"></span></span>',
  "searchPlaceholder": "Suchen",
  "sZeroRecords":     "Keine Einträge vorhanden.",
  "paginate": {
      "first":       "Erste",
      "previous":    '<span class="fa fa-arrow-left"></span>',
      "next":        '<span class="fa fa-arrow-right"></span>',
      "last":        "Letzte"
  },
  "oAria": {
      "sSortAscending":  ": aktivieren, um Spalte aufsteigend zu sortieren",
      "sSortDescending": ": aktivieren, um Spalte absteigend zu sortieren"
  },
  select: {
          rows: {
          _: '%d Zeilen ausgewählt',
          0: 'Zum Auswählen auf eine Zeile klicken',
          1: '1 Zeile ausgewählt'
          }
  }
}

/* eslint-env jquery, browser */
$(document).ready(() => {
  $('[data-toggle="tooltip"]').tooltip()
});


var captcha = false;
var cb = function() {
	captcha = true;
}

$(document).ready(function() {

  if ( $("#flash_messages").length ) {
  	$("#flash_messages").show();
  }

  var tableTable = $('#table-table').DataTable({
  	language: dataTableLanguange,
  	pageLength: 25,
  	order: [[ 1, 'desc' ]]
  });
  
  if($('#table-table').length) {
	$('#places-select').change(function(event) {
	  	var newPlace = this.value;
	  	$.get('/set/'+newPlace, function(data) {
	  		place = data.place;
	  		location.reload();
	  	})
	});  

	$(document).on('click', '.carousel-control-prev', function () {
		$(this).parents('.carousel').carousel("prev");
	});
	$(document).on('click', '.carousel-control-next', function () {
		$(this).parents('.carousel').carousel("next");
	});


  } else if (window.location.pathname !== '/') {
	$('#places-select').change(function(event) {
	  	var newPlace = this.value;
	  	$.get('/set/'+newPlace, function(data) {
	  	})
	});    	
  } 

    $(document).on('click', '#table-table td', function () {
        var tr = $(this).parent();
        var icon = $(this).children('span');
        var row = tableTable.row( tr );        
        var details = tr.children('td.table-row-details').html();
        tr.parent().children('tr.selected').removeClass('selected');
        tr.addClass('selected');


        bootbox.dialog({
        	title: tr.children('.item-title').text() + " " + tr.children('.item-rating').html(),
        	message: details,
    		backdrop: false,        	    		
    		onEscape: true,
        	buttons: {
		        ok: {
		            label: '<span class="fa fa-map-marker-alt"> Karte</span>',
		            className: 'btn-success',
		            callback: function(){
		                //$(location).attr("href", "/#item_"+tr.data('id'));
		                window.open("/#item_"+tr.data('id'), '_blank');
		            }
		        }        		
        	},
        	onShown: function() {
		   		$('#mediaCarousel').carousel({
				  	interval: 0
		 	    });
        	},
        	onHide: function() {
		        tr.parent().children('tr.selected').removeClass('selected');
        	}
        })        

    } );  

});

$(document).on("submit", ".captcha-form", function (e) {
	if(captcha) {
		return true;
	} else {
		$('#send-contact-form').parent().parent().before('<div class="form-group"><div class="col-md-12"><div class="alert alert-danger fade show"><button class="close" data-dismiss="alert"><i class="far fa-times-circle"></i></button>Leider kein Zutritt für Roboter!</div></div></div>')
		return false;
	}
});
