var klass = require('klass');
var ajax = require('ajax');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var WebSocket = require('ws');
var Promise = require('es6-promise').Promise


var Connection = klass(function (settings){

  console.log("Connection")

}).methods({
  initialize: function(){
    console.log("initialize Connection")
    getServerInfo().then(function(result){
      console.log(result);
      this.serverInfo= JSON.parse(result);
      this._connect(this.serverInfo.server);
    }.bind(this));
  },
  serverURL: function () {
    console.log("serverURL")
        var server = this._settings.server
        if (server && new Date() < server.expires) return server.url
        else return null
  },
  _connect: function(url){
    var ws = new WebSocket(url)
    ws.onopen = function () {
      console.log("open")
    }
    ws.onclose = function (evt) {
    }.bind(this)
    this._ws = ws;
  }
});

var Chat = klass(function(peerId){
  settings = settings || {};
  this._settings = {
      appId: settings.appId,
      peerId: settings.peerId,
      sp: settings.sp || false,
      auth: settings.auth,
      secure: settings.secure !== undefined ? !!settings.secure : true,
      keepAlive: settings.keepAlive >= 3000 ? 0|settings.keepAlive : 240 * 1000, // 4 minutes
      server: settings.server,
  }
  console.log("chat")
}).methods({
  initialize: function(){
    if(!Chat.prototype.con){
      Chat.prototype.con = new Connection();
    }
    // this.connect();
  },

  open: function() {

  }
});

function getServerInfo(){
  var url = 'http://router.g0.push.avoscloud.com/v1/route?appId=28ferwlg9sncja6qw9ede6ruomjfed7lex4dljhlg80u23xl&secure=1';
  return get(url);
}

function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.responseText);
      }
      else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(req.statusText));
      }
    };
    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
}
// var con = new Connection();
var chat = new Chat(1);
var chat = new Chat(2);
// getServerInfo();