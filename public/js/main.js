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

});

$(document).on("submit", ".captcha-form", function (e) {
	if(captcha) {
		return true;
	} else {
		$('#send-contact-form').parent().parent().before('<div class="form-group"><div class="col-md-12"><div class="alert alert-danger fade show"><button class="close" data-dismiss="alert"><i class="far fa-times-circle"></i></button>Leider kein Zutritt für Roboter!</div></div></div>')
		return false;
	}
});
