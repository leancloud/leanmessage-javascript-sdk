// var klass = require('klass');
// var ajax = require('ajax');
XMLHttpRequest = typeof XMLHttpRequest === 'undefined'? require("xmlhttprequest").XMLHttpRequest : XMLHttpRequest;
var WebSocket = require('ws');
var Promise = require('es6-promise').Promise;
var EventEmitter = require('events').EventEmitter;
module.exports.WebClient = WebClient;
function WebClient (settings) {
  if(this instanceof WebClient == false){
    return new WebClient(settings)
  }
  var _emitter, connectionStatus, _settings, _waitCommands, peerIds, server, ws;
  function initialize (settings){
    if (!settings) throw new Error('settings')
    if (!settings.appId) throw new Error('settings.appId')
    if (!settings.peerId) throw new Error('settings.peerId')
    _settings = settings || {};
    _waitCommands = [];
    console.log("initialize Connection");
    _emitter = new EventEmitter();
    peerIds = [];
    connectionStatus= "noconnected";
  }
  initialize(settings);
  function _getServerInfo(appId){
    var url = 'http://router.g0.push.avoscloud.com/v1/route?appId='+appId+'&secure=1';
    return get(url);
  }
  function _connect(){
    console.log("connect")
    console.log(server)
    if (server && new Date() < server.expires){
      return new Promise(function(resolve,reject){
        console.log("new websocket"+server.server)


        ws = new WebSocket(server.server);
        ws.onopen = function () {
          connectionStatus = 'connected';
          console.log("onopen")
          resolve(server);
        };
        ws.onmessage = function(message){
          console.log("onmessage",message.data)
          var data = JSON.parse(message.data);
          console.log(data,data['peerId'])
          if(data.op == 'opened'){
            _emitter.emit('opened',data.onlineSessionPeerIds);
            // _emitter.emit('initOnlinePeers',data.onlineSessionPeerIds);
          }
          if(data.cmd == 'presence'){
            if(data.status == 'on'){
              _emitter.emit('newOnlinePeers',data.sessionPeerIds);
            }else if(data.status == 'off'){
              _emitter.emit('newOfflinePeers',data.sessionPeerIds);
            }
          }
          var cmd = data.op? data.cmd + data.op:data.cmd;
          if ( _waitCommands.length > 0 && _waitCommands[0][0] === cmd) {
            _waitCommands.shift()[1](data);
          }
        };
      });
    }else{
      return _getServerInfo(_settings.appId).then(function(result){
        server = JSON.parse(result);
        server.expires = Date.now() + server.ttl * 1000;
        return _connect();
      });
    }
  }
  function _openSession() {
    console.log("_openSession")
    var msg = {"cmd": "session",
         "op": "open",
         "sessionPeerIds": _settings.peerIds,
         "peerId": _settings.peerId,
         "appId": _settings.appId
         }
    var s = JSON.stringify(msg)
    ws.send(s);
    return _wait('sessionopened');
  }
  function _wait (command) {
    return new Promise(function (resolve, reject) {
      _waitCommands.push([command, resolve, reject]);
    });
  }
  this.open =function(){
    if(connectionStatus == 'connecting'){
      return Promise.reject('should not call open again while  already call open method');
    }else if(connectionStatus == 'connected'){
      return Promise.resolve();
    }
    connectionStatus= 'connecting';
    return _connect().then(function(){
      return _openSession();
    });
  };
  this.send = function(msg,to) {
    var msg = {
      "cmd": "direct",
      "op": "open",
      "sessionPeerIds": [].concat(to),
      "peerId": _settings.peerId,
      "appId": _settings.appId
    }
    ws.send(JSON.stringify(msg));
    return _wait('ack');
  };

  this.on = function(name,func){
    console.log('on', _emitter)
    _emitter.on(name,func)
  };

  this.close = function(){

  }



};




function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);
    // req.withCredentials = false;
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

// var chat = new Chat(2);
// getServerInfo();

