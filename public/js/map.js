

var satellite = L.tileLayer('https://api.tiles.mapbox.com/v4/mapbox.streets-satellite/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 23,
    id: 'mapbox.satellite',
    accessToken: 'pk.eyJ1Ijoic291ZGlzIiwiYSI6ImNqdXNwMmdyYTBsdng0NHA1OHoxb3UyMDMifQ._7f-z0VD4yYRRz97YjtxXg'
})

var streets = L.tileLayer('https://api.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 23,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoic291ZGlzIiwiYSI6ImNqdXNwMmdyYTBsdng0NHA1OHoxb3UyMDMifQ._7f-z0VD4yYRRz97YjtxXg'
})

var map = L.map('map', {
    center: [48.2953, 14.273],
    zoom: 13,
    layers: [ streets]
});

var baseMaps = {
    "Satellit": satellite,
    "Karte": streets
};


L.control.layers(baseMaps, undefined).addTo(map);

var menuControl
/*function createMenu(menu) {
  if (menuControl) {
    map.removeLayer(menuControl);
    menuControl = undefined;
  }
  menuControl = L.control.custom({
    position: 'topright',
    content : menu.html,              
    classes : 'btn-group-vertical btn-group-sm',
    style   :
    {
        margin: '10px',
        padding: '0px 0 0 0',
        cursor: 'pointer',
    },
    datas   :
    {
        'foo': 'bar',
    },
    events:
    {
        click: function(data)
        {
            console.log('wrapper div element clicked');
            console.log(data);
        },
        dblclick: function(data)
        {
            console.log('wrapper div element dblclicked');
            console.log(data);
        },
        contextmenu: function(data)
        {
            console.log('wrapper div element contextmenu');
            console.log(data);
        },
    }
  })
  .addTo(map);
}

function loadMenu() {
  $.ajax({
      type: 'get',     
      dataType: 'json',
      url: '/map/menu',
      success: createMenu,
      error: showError
  }); 
}

loadMenu();*/

var tableIcon = L.icon({
    iconUrl: 'table.png',
//    shadowUrl: 'leaf-shadow.png',

    iconSize:     [45, 45], // size of the icon
//    shadowSize:   [50, 64], // size of the shadow
//    iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
//    shadowAnchor: [4, 62],  // the same for the shadow
//    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

var tableIconActive = L.icon({
    iconUrl: 'table_green.png',
//    shadowUrl: 'leaf-shadow.png',

    iconSize:     [45, 45], // size of the icon
//    shadowSize:   [50, 64], // size of the shadow
//    iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
//    shadowAnchor: [4, 62],  // the same for the shadow
//    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

$(window).on("resize", function () { 
  var position = $("#map").position();
  $("#map").height($(window).height()-position.top); map.invalidateSize(); }).trigger("resize");

function showError(error) {
  console.log("Error: " + JSON.stringify(error));
}

function carouselNormalization() {
  var items = $('.carousel .carousel-item'), //grab all slides
      heights = [], //create empty array to store height values
      tallest; //create variable to make note of the tallest slide

  if (items.length) {
      function normalizeHeights() {
          items.each(function() { //add heights to array
              heights.push($(this).children('img').height()); 
          });
          tallest = Math.max.apply(null, heights); //cache largest value
          items.each(function() {
              $(this).css('min-height',tallest + 'px');
          });
      };
      normalizeHeights();

      $(window).on('resize orientationchange', function () {
          tallest = 0, heights.length = 0; //reset vars
          items.each(function() {
              $(this).css('min-height','0'); //reset min-height
          }); 
          normalizeHeights(); //run it again 
      });
  }
}

var sidebar = L.control.sidebar('sidebar', {
    position: 'right'
});

map.addControl(sidebar);

sidebar.hide();

items = {};


function addItem (item) {
  items[item.id] = L.marker(item.latLong, {icon: tableIcon, riseOnHover: true}).addTo(map).on('click', onPopupOpen);
  items[item.id].html = item.html
  return items[item.id];

}

function removeItem (id) {
  items[id].closePopup();  
  map.removeLayer(items[id]);
  items[id] = undefined;
}

function refreshItemsOnMap (items) {
//  map.clearLayers();
  items.map(addItem);
}

function refreshItems () {
  $.ajax({
      type: 'get',     
      dataType: 'json',
      url: '/item/fetch',
      success: refreshItemsOnMap,
      error: showError
  });    
}

var uploadedFiles = [];

function initFineUploader () {
  uploadedFiles = [];
  var form = $("#fine-uploader-gallery").parents("form");
  var galleryUploader = new qq.FineUploader({
    element: document.getElementById("fine-uploader-gallery"),
    template: 'qq-template-gallery',
    request: {
        endpoint: '/media/upload'
    },
    thumbnails: {
        placeholders: {
            waitingPath: '/placeholders/waiting-generic.png',
            notAvailablePath: '/placeholders/not_available-generic.png'
        }
    },
    validation: {
        allowedExtensions: ['jpeg', 'jpg', 'gif', 'png']
    },
    deleteFile: {
      enabled: true,
      method: "DELETE",
      endpoint: "/media/delete"
    },
    callbacks: {
      onComplete: (id) => {
        var uuid = galleryUploader.getUuid(id);
//        var form = $('#create-item-form');
        form.prepend('<input type="hidden" id="fileupload_'+uuid+'" name="uploadedFiles[]" value="'+uuid+'">');
      },
      onDeleteComplete: (id) => {
        var uuid = galleryUploader.getUuid(id);
        $("#fileupload_"+uuid).remove();
      }
    }
});

}

const editItemSuccess = (item) => {
  removeItem(item.id);
  openItem(addItem(item));
}

const rateSuccess = (result) => {
  $('.sidebar-content').children('h4.item-title').replaceWith(result.title);
  $('.sidebar-content').children('.rating-total').replaceWith(result.total);
}

const initButtons = () => {
  var removeItem = document.getElementById("remove-item");
  if (removeItem) {
    L.DomEvent.on(removeItem, 'click', function () {
      removeTemporary();  
      var id = $("#remove-item").attr('ref-id');
      $.ajax({
          type: 'get',     
          dataType: 'json',
          url: '/item/delete/' + id,
          success: () => { removeItem(id) },
          error: showError
      });
    });        
  }

  var editItem = document.getElementById("edit-item");
  if (editItem) {
    L.DomEvent.on(editItem, 'click', function () {
      removeTemporary();  
      var id = $("#edit-item").attr('ref-id');
      $.ajax({
          type: 'get',     
          dataType: 'json',
          url: '/item/edit/' + id,
          success: showControlPane,
          error: showError
      }); 
    });        
  }

  var closeItem = document.getElementById("close-item");
  if (closeItem) {
    L.DomEvent.on(closeItem, 'click', function () {
      sidebar.hide();
      if (activeItem) {
        activeItem.setIcon(tableIcon);
        activeItem = undefined;
      }
    });        
  }  

  var createItem = document.getElementById("create-item");
  if (createItem) {
    L.DomEvent.on(createItem, 'click', function (e) {
      e.preventDefault();
      var form = $('#create-item-form');
      var data = form.serialize();
      $.ajax({
        type:"POST",
        url:form.attr("action"),
        data:data,
        success: (response) => {      
    //      console.log(response);  
          map.removeLayer(tmpItem);
          tmpItem = undefined;
          sidebar.hide();   
          addItem(response);
        }
      }); 
    });        
  }  

  var editItemSubmit = document.getElementById("edit-item-submit");
  if (editItemSubmit) {
    L.DomEvent.on(editItemSubmit, 'click', function (e) {
      console.log("submit");
      e.preventDefault();
      var form = $('#edit-item-form');
      var id = form.attr('ref-id');
      var data = form.serialize();
      $.ajax({
        type:"POST",
        url:form.attr("action"),
        data:data,
        success: editItemSuccess
      });  
    });        
  }  

  var criteriaInputs = document.getElementsByClassName("rating-criteria-input");
  if (criteriaInputs.length > 0) {
    Array.from(criteriaInputs).forEach(criteriaInput => {

      L.DomEvent.on(criteriaInput, 'click', function (e) {
        e.preventDefault();
        var rating = $(this).attr('data-rating');
        var refId = $(this).attr('ref-id');
        var ref = $("#"+refId);
        ref.attr('data-criteria-rating', rating);
        var criteriaName = ref.attr('data-criteria-name');
        var itemId = ref.attr('data-item-id');

        $(this).removeClass("star-rating-off");
        $(this).addClass("star-rating-on");
        
        var prev = $(this).prev('span.rating-criteria-input');
        while(prev.length > 0) {
          prev.removeClass("star-rating-off");
          prev.addClass("star-rating-on");
          prev = prev.prev('span.rating-criteria-input');
        }

        var next = $(this).next('span.rating-criteria-input');
        while(next.length > 0) {
          next.addClass("star-rating-off");
          next.removeClass("star-rating-on");
          next = next.next('span.rating-criteria-input');
        }


        $.ajax({
          type:"put",
          url:'/item/rate/'+itemId+'/'+criteriaName+'/'+rating,
          dataType: 'json',
          success: rateSuccess,
          error: (error) => {
            showMessagePane("error", error.html);      
          }
        });    
      }); 

    })
           
  }  
  var closeItem = document.getElementById("close-item");
  if (closeItem) {
    L.DomEvent.on(closeItem, 'click', function () {

    });        
  }  
  var closeItem = document.getElementById("close-item");
  if (closeItem) {
    L.DomEvent.on(closeItem, 'click', function () {

    });        
  }  


}

var activeItem;

const openItem = (item) => {
  removeTemporary();
  $('#sidebar').html(item.html);
  if (activeItem) {
    activeItem.setIcon(tableIcon);
    activeItem = undefined;
  }
  activeItem = item;
  item.setIcon(tableIconActive);
  sidebar.show();
  initButtons();

  $('.carousel').carousel({
    interval: 0
  });
  carouselNormalization();
}

const onPopupOpen = (event) => {
  openItem(event.target);
}



var controlPane;
var tmpItem;
const showControlPane = (result) => { 
  $('#sidebar').html(result.html);
  sidebar.show();
  initButtons();
  initFineUploader();
}

refreshItems();

function removeTemporary() {
  if (tmpItem) {
    map.removeLayer(tmpItem);
    tmpItem = undefined;
  }
}

const mapClicked = (event) => {
  if (userLoggedIn) {
    removeTemporary();
    if (sidebar.isVisible()) {
      sidebar.hide();
      if (activeItem) {
        activeItem.setIcon(tableIcon);
        activeItem = undefined;
      }

    } else {
      tmpItem = L.marker([event.latlng.lat,event.latlng.lng], {icon: tableIcon});
      tmpItem.addTo(map);
      $.ajax({
          type: 'get',     
          dataType: 'json',
          url: '/item/create/'+event.latlng.lat+'/'+event.latlng.lng,
          success: showControlPane,
          error: showError
      });    
    }
  }
}

map.on('click', mapClicked);



/*
$(document).on("click", "#close-control-pane", function (e) {
  if (tmpItem) {
    map.removeLayer(tmpItem);
    tmpItem = undefined;
  }
  if (controlPane) {
    map.removeControl(controlPane);
    controlPane = undefined;
  }   
});*/

/*$(document).on("click", "#get-login", function (e) {
  removeTemporary();  
  $.ajax({
      type: 'get',     
      dataType: 'json',
      url: '/login',
      success: showControlPane,
      error: showError
  });    
});

$(document).on("click", "#get-signup", function (e) {
  removeTemporary();  
  $.ajax({
      type: 'get',     
      dataType: 'json',
      url: '/signup',
      success: showControlPane,
      error: showError
  });    
});


$(document).on("click", "#get-edit-account", function (e) {
  removeTemporary();  
  $.ajax({
      type: 'get',     
      dataType: 'json',
      url: '/account',
      success: showControlPane,
      error: showError
  });    
});

$(document).on("click", "#get-lostpasswd", function (e) {
  removeTemporary();  
  $.ajax({
      type: 'get',     
      dataType: 'json',
      url: '/forgot',
      success: showControlPane,
      error: showError
  });    
});

$(document).on("click", "#get-contact-form", function (e) {
  removeTemporary();  
  $.ajax({
      type: 'get',     
      dataType: 'json',
      url: '/contact',
      success: showControlPane,
      error: showError
  });    
});

$(document).on("click", "#post-lostpasswd", function (e) {
  e.preventDefault();
  var form = $('#lostpasswd-form');
  var data = form.serialize();  
  removeTemporary();  
  $.ajax({
    type:"POST",
    url:form.attr("action"),
    dataType: 'json',
    data:data,
    success: (response) => {  
      showMessagePane("success", response.html);
      if (controlPane) {
        map.removeControl(controlPane);
        controlPane = undefined;
      }         
    },
    error: (error) => {
      showMessagePane("error", error.html);      
    }
  });    
});


$(document).on("click", "#send-contact-form", function (e) {
  e.preventDefault();
  var form = $('#contact-form');
  var data = form.serialize();  
  removeTemporary();  
  $.ajax({
    type:"POST",
    url:form.attr("action"),
    dataType: 'json',
    data:data,
    success: (response) => {  
      showMessagePane("success", response.html);
      if (controlPane) {
        map.removeControl(controlPane);
        controlPane = undefined;
      }         
    },
    error: (error) => {
      showMessagePane("error", error.html);      
    }
  });    
});*/


var messagePane;
function showMessagePane(type, html) {
  messagePane = L.control.custom({
    position: 'topleft',
    content : html + '<a class="leaflet-popup-close-button" id="close-message-pane" href="#close" style="color:white; outline: currentcolor none medium;">×</a>',              
    classes : 'col-md-12 error-pane alert alert-'+type,
    style   :
    {
        margin: '30px, 10px, 10px, 10px',
        padding: '0px 0 0 0'
    }
  }).addTo(map);

  setTimeout(() => {
    if (messagePane) {
      map.removeControl(messagePane);
      messagePane = undefined;
    }   
  }, 3000)
}

$(document).on("click", "#close-message-pane", function (e) {
  if (messagePane) {
    map.removeControl(messagePane);
    messagePane = undefined;
  }   
});

var logo = L.control({position: 'bottomleft'});
logo.onAdd = function(map){
  var div = L.DomUtil.create('div', 'logo-watermark');
  div.innerHTML= '<img width="92px" src="tt_logo_bunt.png"/>';
  return div;
}

$(document).ready(function() {

  if ( $("#flash_messages").length ) {
    var type = $("#flash_messages").attr('message-type');
    showMessagePane(type, $("#flash_messages").html());
  }

  if ($("#logo-overlay").length == 0) {
    $(".blurred").addClass("unblurred");
    logo.addTo(map);  
  }
});


$( document ).on("click", ".title-logo", function() {
  var $target = $(".title-logo");
  var $pos = $target.position();
  var $width = $target.css("width");
  var $height = $target.css("height");
  $target.css("top", $pos.top - $height/2);
  $target.css("left", $pos.left - $width/2);
  $target.explodeRestore();
  $target.explode({
      maxWidth: 50,
      minWidth: 25,
      radius: 1000,
      release: false,
      recycle: false,
      explodeTime: 320,
      canvas: true,
      round: false,
      maxAngle: 360,
      gravity: 5,
      groundDistance: 2000,
  });
  $(".blurred").addClass("unblurred");

  setTimeout(() => {
    $("#logo-overlay").remove();
    logo.addTo(map);  
  }, 3000);

});