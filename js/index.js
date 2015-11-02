var app = {
  // Application Constructor
  initialize: function() {
    this.bindEvents();
  },
  // Bind Event Listeners
  //
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
  },
  // deviceready Event Handler
  //
  // The scope of 'this' is the event. In order to call the 'receivedEvent'
  // function, we must explicitly call 'app.receivedEvent(...);'
  onDeviceReady: function() {
	  // alert(device.platform+","+device.cordova);
	  var errata = new Errata();
    app.receivedEvent('deviceready');
	var pushConfig = {
	      pushServerURL: "https://aerogear-pntdev.rhcloud.com/ag-push/",
	      ios: { 
	        variantID: "46734504-529e-47b1-a9d8-93ca5b68d3c1",
	        variantSecret: "27ecc4a7-b262-44e0-9943-ab032479e59d"
	      }
	    };
push.register(app.onNotification, successHandler, errorHandler, pushConfig);

function successHandler() {
  alert('success')
}

function errorHandler(message) {
  alert('error ' + message);
}
},
onNotification: function(event) {
  alert(event.alert);
},
// Update DOM on a Received Event
receivedEvent: function(id) {

  console.log('Received Event: ' + id);
}
};

app.initialize();
